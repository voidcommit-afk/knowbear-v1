"""In-memory IP rate limiting for demo mode."""

from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request


MAX_REQUESTS_PER_HOUR = 5
WINDOW_SECONDS = 3600

_requests_by_ip: dict[str, deque[float]] = defaultdict(deque)
_rate_lock = asyncio.Lock()


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


async def enforce_ip_rate_limit(request: Request) -> None:
    """Allow up to MAX_REQUESTS_PER_HOUR in rolling one-hour window per IP."""
    ip = _get_client_ip(request)
    now = datetime.now(timezone.utc).timestamp()
    cutoff = now - WINDOW_SECONDS

    async with _rate_lock:
        bucket = _requests_by_ip[ip]
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= MAX_REQUESTS_PER_HOUR:
            retry_after_seconds = int(max(1, WINDOW_SECONDS - (now - bucket[0])))
            retry_at = datetime.now(timezone.utc) + timedelta(seconds=retry_after_seconds)
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": "Demo limit reached: 5 requests per hour per IP. Please try again later.",
                    "retry_after_seconds": retry_after_seconds,
                    "retry_at_utc": retry_at.isoformat(),
                },
            )

        bucket.append(now)
