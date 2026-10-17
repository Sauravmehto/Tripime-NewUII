"""Brute-force protection for admin login: progressive, always-expiring lockouts.

Counters live in a store. Memory is used for a single process; set REDIS_URL so every
instance shares the same counters. If Redis is unreachable we fall back to memory for that
call (and log a warning) rather than leaving the login open or unusable.

Keys are hashed, and nothing logged here ever contains a password, token or username.
"""

from __future__ import annotations

import hashlib
import logging
import math
import threading
import time
from typing import Protocol

from app import config

log = logging.getLogger("tripime.login_throttle")

def _now() -> float:
    return time.time()


STRIKE_TTL_SECONDS = 24 * 3600  # repeat offenders are remembered for a day


class ThrottleStore(Protocol):
    def locked_for(self, key: str) -> int: ...

    def record_failure(self, key: str, threshold: int, window: int, base: int, cap: int) -> int: ...

    def reset(self, key: str) -> None: ...


def lock_seconds(strikes: int, base: int, cap: int) -> int:
    return min(base * (2 ** max(strikes - 1, 0)), cap)


class MemoryStore:
    """Thread-safe, per-process. Bounded so spraying random usernames can't grow it forever."""

    MAX_KEYS = 20_000

    def __init__(self) -> None:
        self._lock = threading.Lock()
        # key -> [fail_count, fail_expires_at, strikes, strikes_expire_at, locked_until]
        self._rows: dict[str, list[float]] = {}

    def _prune(self, now: float) -> None:
        if len(self._rows) < self.MAX_KEYS:
            return
        for k in [k for k, r in self._rows.items() if r[1] <= now and r[3] <= now and r[4] <= now]:
            del self._rows[k]
        if len(self._rows) >= self.MAX_KEYS:  # still full: drop the oldest-inserted entries
            for k in list(self._rows)[: self.MAX_KEYS // 10]:
                del self._rows[k]

    def locked_for(self, key: str) -> int:
        now = _now()
        with self._lock:
            row = self._rows.get(key)
            if not row or row[4] <= now:
                return 0
            return math.ceil(row[4] - now)

    def record_failure(self, key: str, threshold: int, window: int, base: int, cap: int) -> int:
        now = _now()
        with self._lock:
            self._prune(now)
            row = self._rows.setdefault(key, [0, 0, 0, 0, 0])
            if row[1] <= now:
                row[0] = 0
            if row[3] <= now:
                row[2] = 0
            row[0] += 1
            row[1] = now + window
            if row[0] < threshold:
                return 0
            row[0] = 0
            row[2] += 1
            row[3] = now + STRIKE_TTL_SECONDS
            seconds = lock_seconds(int(row[2]), base, cap)
            row[4] = now + seconds
            return seconds

    def reset(self, key: str) -> None:
        with self._lock:
            self._rows.pop(key, None)


# One atomic step on the server, so concurrent instances can't both miss the threshold.
_REDIS_RECORD = """
local fails = redis.call('INCR', KEYS[1])
if fails == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
if fails < tonumber(ARGV[1]) then return 0 end
redis.call('DEL', KEYS[1])
local strikes = redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[5]))
local secs = tonumber(ARGV[3]) * (2 ^ (strikes - 1))
if secs > tonumber(ARGV[4]) then secs = tonumber(ARGV[4]) end
secs = math.floor(secs)
redis.call('SET', KEYS[3], '1', 'EX', secs)
return secs
"""


class RedisStore:
    def __init__(self, client) -> None:  # redis.Redis-compatible
        self._r = client
        self._script = client.register_script(_REDIS_RECORD)

    @staticmethod
    def _k(kind: str, key: str) -> str:
        return f"tripime:login:{kind}:{key}"

    def locked_for(self, key: str) -> int:
        ttl = self._r.ttl(self._k("lock", key))
        return max(int(ttl), 0) if ttl and ttl > 0 else 0

    def record_failure(self, key: str, threshold: int, window: int, base: int, cap: int) -> int:
        return int(
            self._script(
                keys=[self._k("fail", key), self._k("strike", key), self._k("lock", key)],
                args=[threshold, window, base, cap, STRIKE_TTL_SECONDS],
            )
        )

    def reset(self, key: str) -> None:
        self._r.delete(self._k("fail", key), self._k("strike", key), self._k("lock", key))


class LoginThrottle:
    def __init__(self, primary: ThrottleStore) -> None:
        self._primary = primary
        self._fallback = MemoryStore()

    def _call(self, name: str, *args):
        try:
            return getattr(self._primary, name)(*args)
        except Exception as exc:  # noqa: BLE001 - any store failure must degrade, not open the door
            log.warning("login throttle store unavailable (%s); using in-process counters", type(exc).__name__)
            return getattr(self._fallback, name)(*args)

    @staticmethod
    def keys(ip: str, username: str) -> tuple[str, str]:
        digest = hashlib.sha256(username.strip().lower()[:128].encode("utf-8", "ignore")).hexdigest()[:24]
        return f"ip:{ip[:64]}", f"acct:{digest}"

    def locked_seconds(self, ip: str, username: str) -> int:
        ip_key, acct_key = self.keys(ip, username)
        return max(self._call("locked_for", ip_key), self._call("locked_for", acct_key))

    def record_failure(self, ip: str, username: str) -> None:
        ip_key, acct_key = self.keys(ip, username)
        w, base, cap = config.ADMIN_LOGIN_WINDOW_SECONDS, config.ADMIN_LOGIN_LOCK_BASE_SECONDS, config.ADMIN_LOGIN_LOCK_MAX_SECONDS
        self._call("record_failure", ip_key, config.ADMIN_LOGIN_IP_MAX_FAILURES, w, base, cap)
        self._call("record_failure", acct_key, config.ADMIN_LOGIN_ACCOUNT_MAX_FAILURES, w, base, cap)

    def record_success(self, ip: str, username: str) -> None:
        for key in self.keys(ip, username):
            self._call("reset", key)


def _build_store() -> ThrottleStore:
    if config.REDIS_URL:
        try:
            import redis  # optional dependency

            return RedisStore(redis.Redis.from_url(config.REDIS_URL, socket_timeout=2, socket_connect_timeout=2))
        except Exception as exc:  # noqa: BLE001
            log.warning("REDIS_URL set but unusable (%s); using in-process login counters", type(exc).__name__)
    return MemoryStore()


login_throttle = LoginThrottle(_build_store())
