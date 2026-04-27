"""Export endpoints."""

import asyncio
import io

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.ensemble import ensemble_generate
from utils import LEVELS

router = APIRouter(tags=["export"])

ALL_LEVELS = LEVELS


class ExportRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    explanations: dict[str, str]
    format: str = Field(default="txt", pattern="^(txt|md)$")
    mode: str = "fast"


@router.post("/export")
async def export_explanations(req: ExportRequest) -> StreamingResponse:
    """Export explanations in requested format."""
    req.mode = req.mode if req.mode in {"fast", "ensemble"} else "fast"

    missing_levels = [level for level in ALL_LEVELS if level not in req.explanations]
    if missing_levels:
        tasks = {level: ensemble_generate(req.topic, level, req.mode) for level in missing_levels}
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        for level, result in zip(tasks.keys(), results):
            if isinstance(result, str):
                req.explanations[level] = result
            else:
                # Log the actual exception for debugging
                # logger.error(f"Failed to generate {level}: {result}")
                req.explanations[level] = "Error generating content for this level."

    ordered_explanations = {}
    for level in ALL_LEVELS:
        if level in req.explanations:
            ordered_explanations[level] = req.explanations[level]
    req.explanations = ordered_explanations

    slug = req.topic.lower().replace(" ", "-")[:30]
    filename_base = f"knowbear-{slug}"

    if req.format not in {"txt", "md"}:
        raise HTTPException(400, "Requested format is invalid")

    content = f"# {req.topic}\n\n"
    if len(req.explanations) > 1:
        content += "---\n\n"

    for level, text in req.explanations.items():
        if len(req.explanations) > 1:
            level_name = level.replace("eli", "ELI-").upper()
            content += f"## {level_name}\n\n"
        content += f"{text.strip()}\n\n"
        if len(req.explanations) > 1:
            content += "---\n\n"

    media_type = "text/plain" if req.format == "txt" else "text/markdown"
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename_base}.{req.format}"},
    )
