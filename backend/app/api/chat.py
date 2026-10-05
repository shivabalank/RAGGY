import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_document
from app.models.document import STATUS_READY, Document
from app.models.user import User
from app.rag.generator import LLMError
from app.rag.vector_store import VectorStoreError
from app.schemas.chat import ChatIn, ChatMessageOut, ChatRequest, ChatResponse, message_out
from app.services import chat_service
from app.services.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


def _ask(db: Session, user: User, doc: Document, question: str, history=None) -> ChatMessageOut:
    if doc.status != STATUS_READY:
        raise HTTPException(status.HTTP_409_CONFLICT, "This document is still being processed or failed to process.")
    try:
        return message_out(chat_service.answer_question(db, user, doc, question.strip(), history))
    except LLMError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e))
    except VectorStoreError as e:
        logger.error("Vector store error: %s", e)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The search index is unavailable. Please try again.")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Chat failed for document %s", doc.id)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Something went wrong while answering. Please try again.")


# ---- Routes the existing frontend calls (frontend/src/services/api.ts) ----
@router.post("/documents/{document_id}/chat", response_model=ChatMessageOut)
def send_message(body: ChatIn, doc: Document = Depends(get_owned_document),
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _ask(db, user, doc, body.question)


@router.get("/documents/{document_id}/chat", response_model=List[ChatMessageOut])
def history(doc: Document = Depends(get_owned_document), user: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    return [message_out(m) for m in chat_service.get_history(db, user, doc)]


@router.delete("/documents/{document_id}/chat", status_code=status.HTTP_204_NO_CONTENT)
def clear(doc: Document = Depends(get_owned_document), user: User = Depends(get_current_user),
          db: Session = Depends(get_db)):
    chat_service.clear_history(db, user, doc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---- Spec-style aliases: POST /api/chat, GET/DELETE /api/chat/{document_id}/history ----
@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == body.document_id, Document.user_id == user.id).one_or_none()
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    msg = _ask(db, user, doc, body.question, body.conversation_history)
    return ChatResponse(answer=msg.content, sources=msg.sources, message=msg)


@router.get("/chat/{document_id}/history", response_model=List[ChatMessageOut])
def history_alias(doc: Document = Depends(get_owned_document), user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    return [message_out(m) for m in chat_service.get_history(db, user, doc)]


@router.delete("/chat/{document_id}/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_alias(doc: Document = Depends(get_owned_document), user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    chat_service.clear_history(db, user, doc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
