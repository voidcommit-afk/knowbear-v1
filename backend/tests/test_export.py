"""Tests for export endpoint."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_export_txt():
    """Export returns txt file."""
    resp = client.post(
        "/api/export",
        json={"topic": "Test", "explanations": {"eli5": "simple"}, "format": "txt"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/plain; charset=utf-8"
    assert "# Test" in resp.text


def test_export_json():
    """Export returns json file."""
    resp = client.post(
        "/api/export",
        json={"topic": "Test", "explanations": {"eli5": "simple"}, "format": "json"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/json"
    data = resp.json()
    assert data["topic"] == "Test"


def test_export_invalid_format():
    """Export rejects invalid format."""
    resp = client.post(
        "/api/export",
        json={"topic": "Test", "explanations": {}, "format": "exe"},
    )
    assert resp.status_code == 422
