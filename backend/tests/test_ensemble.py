"""Tests for ensemble logic."""

import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_judge_responses_picks_first_on_error():
    """Judge falls back to first response on error."""
    from app.services.ensemble import judge_responses

    with patch("app.services.ensemble.call_model", new_callable=AsyncMock) as mock:
        mock.side_effect = Exception("API error")
        result = await judge_responses("test", ["response1", "response2"])
        assert result == "response1"


@pytest.mark.asyncio
async def test_judge_responses_parses_json():
    """Judge correctly parses model output."""
    from app.services.ensemble import judge_responses

    with patch("app.services.ensemble.call_model", new_callable=AsyncMock) as mock:
        mock.return_value = '{"best": 1, "reason": "clearer"}'
        result = await judge_responses("test", ["worse", "better"])
        assert result == "better"


@pytest.mark.asyncio
async def test_ensemble_generate_single_model():
    """Single successful model returns its result."""
    from app.services.ensemble import ensemble_generate

    with patch("app.services.ensemble.generate_explanation", new_callable=AsyncMock) as mock:
        mock.side_effect = [Exception("fail"), "success"]
        result = await ensemble_generate("topic", "eli5", False)
        assert result == "success"


@pytest.mark.asyncio
async def test_ensemble_generate_all_fail():
    """All models failing raises error."""
    from app.services.ensemble import ensemble_generate

    with patch("app.services.ensemble.generate_explanation", new_callable=AsyncMock) as mock:
        mock.side_effect = Exception("all fail")
        with pytest.raises(RuntimeError, match="All models failed"):
            await ensemble_generate("topic", "eli5", False)
