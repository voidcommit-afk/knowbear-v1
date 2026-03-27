from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import config as config_module
import main as main_app
import rate_limit as rate_limit_module
import services.cache as cache_module
import services.model_provider as model_provider_module


class DummyRedis:
    def __init__(self):
        self.store = {}

    async def ping(self):
        return True

    async def get(self, key):
        return self.store.get(key)

    async def setex(self, key, _ttl, value):
        self.store[key] = value
        return True

    async def close(self):
        return True


class DummyProvider:
    gemini_configured = False

    async def initialize(self):
        return None

    async def close(self):
        return None

    async def route_inference(self, *args, **_kwargs):
        return {"provider": "dummy", "model": "dummy", "content": "ok"}

    async def route_inference_stream(self, _prompt, **_kwargs):
        yield "ok"


@pytest.fixture(scope="session")
def test_settings():
    return SimpleNamespace(
        environment="test",
        groq_api_key="",
        gemini_api_key="",
        redis_url="redis://localhost:6379",
        cache_ttl=5,
        rate_limit_per_ip_hour=5,
        tavily_api_key="",
        serper_api_key="",
        exa_api_key="",
    )


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch, test_settings):
    monkeypatch.setattr(config_module, "get_settings", lambda: test_settings)
    monkeypatch.setattr(main_app, "get_settings", lambda: test_settings)
    monkeypatch.setattr(cache_module, "get_settings", lambda: test_settings)
    monkeypatch.setattr(model_provider_module, "get_settings", lambda: test_settings)
    return test_settings


@pytest.fixture
def dummy_redis():
    return DummyRedis()


@pytest.fixture
def app_client(monkeypatch, dummy_redis):
    monkeypatch.setattr(cache_module, "get_redis", lambda: dummy_redis)
    monkeypatch.setattr(
        model_provider_module.ModelProvider,
        "get_instance",
        classmethod(lambda cls: DummyProvider()),
    )
    main_app.app.dependency_overrides = {}
    with TestClient(main_app.app) as client:
        yield client
    main_app.app.dependency_overrides = {}


@pytest.fixture(autouse=True)
def clear_rate_limit_state():
    rate_limit_module._requests_by_ip.clear()
