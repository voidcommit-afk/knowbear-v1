"""Pinned topics endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["pinned"])

PINNED_TOPICS = [
    {"id": "tcp-ip", "title": "TCP/IP Layers", "description": "Protocols and responsibilities by layer."},
    {"id": "osi", "title": "OSI Model", "description": "A clean reference for network fundamentals."},
    {"id": "linux-windows", "title": "Linux vs Windows for Dev", "description": "Tradeoffs for daily development."},
    {"id": "rag", "title": "How LLM RAG Works", "description": "Retrieval + generation in practice."},
]


@router.get("/pinned")
async def get_pinned() -> list[dict]:
    """Return curated pinned topics."""
    return PINNED_TOPICS
