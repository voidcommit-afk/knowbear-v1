"""Export endpoint for downloading explanations."""

import io
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from auth import verify_token

router = APIRouter(tags=["export"])


class ExportRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    explanations: dict[str, str]
    format: str = Field(default="txt", pattern="^(txt|json|pdf|md)$")
    premium: bool = False


@router.post("/export")
async def export_explanations(req: ExportRequest) -> StreamingResponse:
    """Export explanations in requested format."""
    # Gate all export features
    if not req.premium:
        raise HTTPException(status_code=403, detail="Exporting is a premium feature. Please upgrade to use this functionality.")

    if req.format == "txt":
        content = f"# {req.topic}\n\n"
        for level, text in req.explanations.items():
            content += f"## {level.upper()}\n{text}\n\n"
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={req.topic[:20]}.txt"},
        )
    elif req.format == "md":
        content = f"# {req.topic}\n\n"
        for level, text in req.explanations.items():
            content += f"## {level.upper()}\n\n{text}\n\n"
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename={req.topic[:20]}.md"},
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
            from fpdf import FPDF
            
            class PDF(FPDF):
                def header(self):
                    self.set_font("helvetica", "B", 15)
                    self.cell(0, 10, req.topic, align="C")
                    self.ln(20)

            pdf = PDF()
            pdf.add_page()
            pdf.set_auto_page_break(auto=True, margin=15)
            
            # Add content
            for level, text in req.explanations.items():
                pdf.set_font("helvetica", "B", 12)
                pdf.cell(0, 10, level.replace("eli", "ELI-").upper(), ln=True)
                pdf.ln(2)
                
                pdf.set_font("helvetica", "", 11)
                # Handle unicode characters that might break latin-1
                safe_text = text.encode('latin-1', 'replace').decode('latin-1')
                pdf.multi_cell(0, 6, safe_text)
                pdf.ln(10)

            # Output to buffer
            pdf_bytes = pdf.output()
            if isinstance(pdf_bytes, (bytes, bytearray)):
                buf = io.BytesIO(pdf_bytes)
            else:
                buf = io.BytesIO()
                pdf.output(buf)
                buf.seek(0)

            return StreamingResponse(
                buf,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={req.topic[:20]}.pdf"},
            )
        except Exception as e:
            print(f"PDF Error: {e}")
            raise HTTPException(500, "PDF generation failed")
            
    raise HTTPException(400, "Invalid format")
