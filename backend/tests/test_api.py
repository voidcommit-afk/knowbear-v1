"""Tests for API endpoints."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    """Health endpoint returns ok."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_pinned():
    """Pinned endpoint returns topics."""
    resp = client.get("/api/pinned")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert "title" in data[0]


def test_query_invalid_topic():
    """Query rejects empty topic."""
    resp = client.post("/api/query", json={"topic": ""})
    assert resp.status_code == 422


def test_security_headers():
    """Response includes security headers."""
    resp = client.get("/health")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
