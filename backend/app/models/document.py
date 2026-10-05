from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.user import _now, _uuid
from app.services.database import Base

# Statuses match the frontend's DocStatus type ("uploading" is shown client-side while bytes are in flight).
STATUS_PROCESSING = "processing"
STATUS_READY = "ready"
STATUS_FAILED = "failed"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(512))
    file_type: Mapped[str] = mapped_column(String(8))  # "pdf" | "docx"
    file_size: Mapped[int] = mapped_column(BigInteger)
    s3_key: Mapped[str] = mapped_column(String(1024))  # object key (S3 key, or relative path in local storage)
    status: Mapped[str] = mapped_column(String(16), default=STATUS_PROCESSING, index=True)
    pages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # PDFs only
    chunk_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user = relationship("User", back_populates="documents")
    sessions = relationship("ChatSession", back_populates="document", cascade="all, delete-orphan")
