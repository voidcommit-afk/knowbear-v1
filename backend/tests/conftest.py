import sys
from unittest.mock import MagicMock, AsyncMock

# Mock supabase package before it is imported by app modules
mock_supabase = MagicMock()
sys.modules["supabase"] = mock_supabase
sys.modules["supabase.lib.client_options"] = MagicMock()

# Also mock google.generativeai if needed
mock_genai = MagicMock()
sys.modules["google.generativeai"] = mock_genai

# Mock redis
mock_redis_module = MagicMock()
mock_redis_client = AsyncMock()
mock_redis_client.ping.return_value = True
mock_redis_module.from_url.return_value = mock_redis_client
sys.modules["redis.asyncio"] = mock_redis_module

# Mock fastapi_limiter
mock_limiter = MagicMock()
mock_limiter.FastAPILimiter.init = AsyncMock()
sys.modules["fastapi_limiter"] = mock_limiter
sys.modules["fastapi_limiter.depends"] = MagicMock()
