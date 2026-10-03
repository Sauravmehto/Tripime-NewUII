"""In-memory IP rate limiter for public customer-profile endpoints."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request


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
                    detail="Too many attempts. Please wait a minute and try again.",
                )
            q.append(now)


profile_rate_limiter = IpRateLimiter(max_calls=5, window_seconds=60.0)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"
