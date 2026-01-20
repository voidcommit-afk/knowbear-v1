"""Tests for cache service."""

import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_cache_get_returns_none_on_miss():
    """Cache returns None on miss."""
    from app.services.cache import cache_get

    with patch("app.services.cache.get_redis", new_callable=AsyncMock) as mock:
        mock.return_value.get = AsyncMock(return_value=None)
        result = await cache_get("nonexistent")
        assert result is None


@pytest.mark.asyncio
async def test_cache_get_returns_data_on_hit():
    """Cache returns parsed JSON on hit."""
    from app.services.cache import cache_get

    with patch("app.services.cache.get_redis", new_callable=AsyncMock) as mock:
        mock.return_value.get = AsyncMock(return_value='{"text": "cached"}')
        result = await cache_get("exists")
        assert result == {"text": "cached"}


@pytest.mark.asyncio
async def test_cache_set_stores_with_ttl():
    """Cache set stores with TTL."""
    from app.services.cache import cache_set

    with patch("app.services.cache.get_redis", new_callable=AsyncMock) as mock:
        mock.return_value.setex = AsyncMock(return_value=True)
        result = await cache_set("key", {"data": "value"})
        assert result is True


@pytest.mark.asyncio
async def test_cache_get_handles_exception():
    """Cache get returns None on exception."""
    from app.services.cache import cache_get

    with patch("app.services.cache.get_redis", new_callable=AsyncMock) as mock:
        mock.side_effect = Exception("connection error")
        result = await cache_get("key")
        assert result is None
