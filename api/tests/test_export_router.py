import pytest

import routers.export as export_module


@pytest.mark.asyncio
async def test_export_txt_success(app_client, monkeypatch):
    async def fake_generate(_topic, level, _mode):
        return f"generated-{level}"

    monkeypatch.setattr(export_module, "ensemble_generate", fake_generate)

    resp = app_client.post(
        "/api/export",
        json={
            "topic": "Cats",
            "explanations": {"eli5": "Meow"},
            "format": "txt",
            "mode": "fast",
        },
    )

    assert resp.status_code == 200
    assert "text/plain" in resp.headers.get("content-type", "")
    assert "Cats" in resp.text
    assert "Meow" in resp.text


@pytest.mark.asyncio
async def test_export_missing_levels_triggers_generation(app_client, monkeypatch):
    calls = []

    async def fake_generate(_topic, level, _mode):
        calls.append(level)
        return "generated"

    monkeypatch.setattr(export_module, "ensemble_generate", fake_generate)
    monkeypatch.setattr(export_module, "ALL_LEVELS", ["eli5", "meme"])

    resp = app_client.post(
        "/api/export",
        json={
            "topic": "Cats",
            "explanations": {"eli5": "Meow"},
            "format": "md",
            "mode": "fast",
        },
    )

    assert resp.status_code == 200
    assert "meme" in calls


@pytest.mark.asyncio
async def test_export_invalid_format_validation(app_client):
    resp = app_client.post(
        "/api/export",
        json={
            "topic": "Cats",
            "explanations": {"eli5": "Meow"},
            "format": "pdf",
            "mode": "fast",
        },
    )
    assert resp.status_code == 422
