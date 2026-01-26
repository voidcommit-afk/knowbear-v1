"""Export endpoint for downloading explanations."""

import asyncio
import io
import json

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from auth import verify_token, check_is_pro
from utils import FREE_LEVELS, PREMIUM_LEVELS
from services.ensemble import ensemble_generate

router = APIRouter(tags=["export"])


class ExportRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    explanations: dict[str, str]
    format: str = Field(default="txt", pattern="^(txt|json|pdf|md)$")
    premium: bool = False
    mode: str = "fast"


@router.post("/export")
async def export_explanations(req: ExportRequest, auth_data: dict = Depends(verify_token)) -> StreamingResponse:
    """Export explanations in requested format."""
    # Verify pro status
    user = auth_data["user"]
    is_verified_pro = await check_is_pro(user.id)
    
    if not is_verified_pro:
         # Even if req.premium is True, we reject if DB says otherwise
        raise HTTPException(status_code=403, detail="Exporting is a premium feature. Please upgrade to use this functionality.")
        
    if not req.premium:
         # Fallback check if client honestly sends false
        raise HTTPException(status_code=403, detail="Exporting is a premium feature. Please upgrade to use this functionality.")

    # Identify missing levels we should include
    # We want to provide a complete report.
    target_levels = set(FREE_LEVELS)
    if is_verified_pro: # Only add premium levels if user is actually pro
        target_levels.update(PREMIUM_LEVELS)
    
    current_levels = set(req.explanations.keys())
    missing_levels = list(target_levels - current_levels)

    # If we have missing levels, generate them on the fly
    if missing_levels:
        # We need to trust the topic is valid or sanitize it again?
        # The frontend passed it. 'ensemble_generate' will handle it.
        # But wait, ensemble_generate expects 'is_pro' logic.
        
        # We use the mode requested by the user, or default to fast if not provided (though we set default="fast")
        # Gating: if mode is premium but user not pro, downgrade? User is pro here (checked above).
        
        tasks = {lvl: ensemble_generate(req.topic, lvl, is_verified_pro, req.mode) for lvl in missing_levels}
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        
        for lvl, result in zip(tasks.keys(), results):
            if isinstance(result, str):
                req.explanations[lvl] = result
            else:
                req.explanations[lvl] = f"Error generating content: {str(result)}"
    
    # Sort explanations to be in a nice order: Free first then Premium
    ordered_explanations = {}
    for lvl in FREE_LEVELS:
        if lvl in req.explanations:
            ordered_explanations[lvl] = req.explanations[lvl]
            
    if is_verified_pro:
        for lvl in PREMIUM_LEVELS:
             if lvl in req.explanations:
                ordered_explanations[lvl] = req.explanations[lvl]
                
    # Use ordered dictionary for output
    req.explanations = ordered_explanations

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

            pdf_bytes = await asyncio.to_thread(pdf.output)
            if isinstance(pdf_bytes, (bytes, bytearray)):
                buf = io.BytesIO(pdf_bytes)
            else:
                buf = io.BytesIO()
                await asyncio.to_thread(pdf.output, buf)
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
