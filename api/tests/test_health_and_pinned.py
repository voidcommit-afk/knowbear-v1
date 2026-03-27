import pytest

import routers.pinned as pinned_module


@pytest.mark.asyncio
async def test_health_ok(app_client):
    resp = app_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_health_in_prod(app_client, test_settings):
    old_env = test_settings.environment
    try:
        test_settings.environment = "production"
        resp = app_client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["environment"] == "production"
    finally:
        test_settings.environment = old_env


@pytest.mark.asyncio
async def test_pinned_topics():
    topics = await pinned_module.get_pinned()
    assert topics
    assert topics[0]["id"]
