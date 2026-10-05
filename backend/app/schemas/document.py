from typing import Optional

from pydantic import BaseModel

from app.models.document import Document
from app.schemas.common import iso


class DocumentOut(BaseModel):
    """Matches the frontend's DocumentItem type (frontend/src/types/index.ts)."""

    id: str
    name: str
    type: str
    size: int
    uploadedAt: str
    status: str
    pages: Optional[int] = None
    error: Optional[str] = None


def document_out(d: Document) -> DocumentOut:
    return DocumentOut(
        id=d.id, name=d.filename, type=d.file_type, size=d.file_size,
        uploadedAt=iso(d.created_at), status=d.status, pages=d.pages,
        error=d.error_message if d.status == "failed" else None,
    )
