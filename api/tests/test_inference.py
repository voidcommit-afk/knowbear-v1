import pytest

import services.inference as inference_module


@pytest.mark.asyncio
async def test_generate_explanation_unknown_level():
    with pytest.raises(ValueError):
        await inference_module.generate_explanation("topic", "nope", model="m1")


@pytest.mark.asyncio
async def test_generate_explanation_technical_depth(monkeypatch):
    async def fake_call_model(_model, _prompt, **_kwargs):
        return "base"

    async def fake_context(_topic):
        return "context"

    async def fake_images(_topic):
        return [{"url": "https://example.com/a.png", "title": "A"}]

    async def fake_quote():
        return "quote"

    monkeypatch.setattr(inference_module, "call_model", fake_call_model)
    monkeypatch.setattr(inference_module.search_service, "get_search_context", fake_context)
    monkeypatch.setattr(inference_module.search_service, "get_images", fake_images)
    monkeypatch.setattr(inference_module.search_service, "get_quote", fake_quote)

    result = await inference_module.generate_explanation("topic", "eli5", model="m1", mode="technical_depth")
    assert "### Visual References" in result
    assert "https://example.com/a.png" in result


@pytest.mark.asyncio
async def test_generate_stream_explanation_regenerate_appends_quote(monkeypatch):
    class DummyProvider:
        async def route_inference_stream(self, _prompt, **_kwargs):
            yield "hello"

    async def fake_quote():
        return "---\n*\"Quote\"*"

    monkeypatch.setattr(inference_module.ModelProvider, "get_instance", classmethod(lambda cls: DummyProvider()))
    monkeypatch.setattr(inference_module.search_service, "get_regeneration_quote", fake_quote)

    chunks = []
    async for chunk in inference_module.generate_stream_explanation(
        "topic",
        "eli5",
        mode="fast",
        regenerate=True
    ):
        chunks.append(chunk)

    assert "hello" in "".join(chunks)
    assert "Quote" in "".join(chunks)
