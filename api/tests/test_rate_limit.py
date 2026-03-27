import pytest

import routers.query as query_module


@pytest.mark.asyncio
async def test_rate_limit_5_per_hour_per_ip(app_client, monkeypatch):
    async def fake_cache_get(_key):
        return None

    async def fake_cache_set(_key, _value):
        return True

    async def fake_generate(_topic, _level, _premium, _mode):
        return "ok"

    monkeypatch.setattr(query_module, "cache_get", fake_cache_get)
    monkeypatch.setattr(query_module, "cache_set", fake_cache_set)
    monkeypatch.setattr(query_module, "ensemble_generate", fake_generate)

    headers = {"x-forwarded-for": "1.2.3.4"}
    for _ in range(5):
        resp = app_client.post("/api/query", json={"topic": "Rate", "levels": ["eli5"], "mode": "fast"}, headers=headers)
        assert resp.status_code == 200

    blocked = app_client.post("/api/query", json={"topic": "Rate", "levels": ["eli5"], "mode": "fast"}, headers=headers)
    assert blocked.status_code == 429
    body = blocked.json()
    assert body["detail"]["error"] == "Rate limit exceeded"
