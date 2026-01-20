"""Redis caching service."""

import json
from typing import Any
import redis.asyncio as redis
from app.config import get_settings

_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    """Get or create Redis client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = redis.from_url(settings.redis_url, decode_responses=True)
    return _client


async def cache_get(key: str) -> dict[str, Any] | None:
    """Get cached value."""
    try:
        r = await get_redis()
        val = await r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


async def cache_set(key: str, value: dict[str, Any], ttl: int | None = None) -> bool:
    """Set cached value with TTL."""
    try:
        r = await get_redis()
        settings = get_settings()
        await r.setex(key, ttl or settings.cache_ttl, json.dumps(value))
        return True
    except Exception:
        return False


async def close_redis() -> None:
    """Close Redis connection."""
    global _client
    if _client:
        await _client.close()
        _client = None
