"""In-memory IP rate limiter for public customer-profile endpoints."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request

from app import config


class IpRateLimiter:
    def __init__(self, *, max_calls: int = 5, window_seconds: float = 60.0) -> None:
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > self.window_seconds:
                q.popleft()
            if len(q) >= self.max_calls:
                raise HTTPException(
                    status_code=429,
                    detail="Too many attempts. Please wait a few minutes and try again.",
                )
            q.append(now)


profile_rate_limiter = IpRateLimiter(max_calls=5, window_seconds=60.0)


def client_ip(request: Request) -> str:
    """The caller's address, resistant to a forged X-Forwarded-For.

    Each trusted proxy appends the address it saw to the *right* of the header, so anything an
    attacker types is on the left. With N trusted hops we read the Nth entry from the right.
    With 0 trusted hops the header is ignored entirely.
    """
    hops = config.TRUSTED_PROXY_HOPS
    if hops > 0:
        parts = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
        if len(parts) >= hops:
            return parts[-hops][:64]
    if request.client and request.client.host:
        return request.client.host
    return "unknown"
