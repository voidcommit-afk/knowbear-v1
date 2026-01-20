"""Export endpoint for downloading explanations."""

import io
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(tags=["export"])


class ExportRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    explanations: dict[str, str]
    format: str = Field(default="txt", pattern="^(txt|json|pdf)$")


@router.post("/export")
async def export_explanations(req: ExportRequest) -> StreamingResponse:
    """Export explanations in requested format."""
    if req.format == "txt":
        content = f"# {req.topic}\n\n"
        for level, text in req.explanations.items():
            content += f"## {level.upper()}\n{text}\n\n"
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={req.topic[:20]}.txt"},
        )
    elif req.format == "json":
        data = {"topic": req.topic, "explanations": req.explanations}
        return StreamingResponse(
            io.BytesIO(json.dumps(data, indent=2).encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={req.topic[:20]}.json"},
        )
    elif req.format == "pdf":
        try:
            import pdfkit
            html = f"<h1>{req.topic}</h1>"
            for level, text in req.explanations.items():
                html += f"<h2>{level.upper()}</h2><p>{text}</p>"
            pdf = pdfkit.from_string(html, False)
            return StreamingResponse(
                io.BytesIO(pdf),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={req.topic[:20]}.pdf"},
            )
        except Exception:
            raise HTTPException(500, "PDF generation unavailable")
    raise HTTPException(400, "Invalid format")
