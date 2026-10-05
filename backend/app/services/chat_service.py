"""Chat orchestration: session + history in PostgreSQL, answers from the RAG pipeline."""
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.chat import ChatSession, Message
from app.models.document import Document
from app.models.user import User
from app.rag.pipeline import ask_rag

logger = logging.getLogger(__name__)


def get_session(db: Session, user: User, document: Document, create: bool = False) -> Optional[ChatSession]:
    sess = db.query(ChatSession).filter_by(user_id=user.id, document_id=document.id).one_or_none()
    if sess is None and create:
        sess = ChatSession(user_id=user.id, document_id=document.id)
        db.add(sess)
        db.flush()
    return sess


def get_history(db: Session, user: User, document: Document) -> List[Message]:
    sess = get_session(db, user, document)
    return list(sess.messages) if sess else []


def clear_history(db: Session, user: User, document: Document) -> None:
    sess = get_session(db, user, document)
    if sess:
        db.delete(sess)
        db.commit()


def answer_question(db: Session, user: User, document: Document, question: str,
                    history_hint: Optional[List[Dict[str, Any]]] = None) -> Message:
    """Runs RAG, then saves the user message and the answer together (so a failed attempt leaves no half-saved turn)."""
    sess = get_session(db, user, document, create=True)
    prior = [{"role": m.role, "content": m.content} for m in sess.messages][-6:] or [
        {"role": str(h.get("role")), "content": str(h.get("content"))} for h in (history_hint or [])][-6:]

    answer, sources = ask_rag(question, user_id=user.id, document_id=document.id, conversation_history=prior)

    db.add(Message(session_id=sess.id, role="user", content=question, sources=[]))
    db.flush()
    reply = Message(session_id=sess.id, role="assistant", content=answer, sources=sources)
    db.add(reply)
    db.commit()
    return reply
