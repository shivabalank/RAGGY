from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.chat import Message
from app.schemas.common import iso


class SourceOut(BaseModel):
    id: str
    documentId: str
    documentName: str
    page: Optional[int] = None
    section: Optional[str] = None
    snippet: str
    score: Optional[float] = None


class ChatMessageOut(BaseModel):
    """Matches the frontend's ChatMessage type."""

    id: str
    role: str
    content: str
    createdAt: str
    sources: List[SourceOut] = []


def message_out(m: Message) -> ChatMessageOut:
    return ChatMessageOut(
        id=m.id, role=m.role, content=m.content, createdAt=iso(m.created_at),
        sources=[SourceOut(**s) for s in (m.sources or [])],
    )


class ChatIn(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    """Body for the spec-style POST /api/chat endpoint."""

    document_id: str
    question: str = Field(min_length=1, max_length=2000)
    conversation_history: Optional[List[Dict[str, Any]]] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceOut] = []
    message: ChatMessageOut
