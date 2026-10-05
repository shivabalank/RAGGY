import logging
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_document
from app.config import get_settings
from app.models.document import STATUS_PROCESSING, Document
from app.models.user import User, _uuid
from app.rag import vector_store
from app.schemas.document import DocumentOut, document_out
from app.services.database import get_db
from app.services.ingestion import process_document
from app.services.storage import StorageError, assert_key_owned, build_key, get_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED = {
    "pdf": ("application/pdf", b"%PDF"),
    "docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", b"PK"),  # docx is a zip
}


@router.get("", response_model=List[DocumentOut])
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.user_id == user.id).order_by(Document.created_at.desc()).all()
    return [document_out(d) for d in docs]


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = get_settings()
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported file type. Please upload a PDF or DOCX file.")

    data = file.file.read(s.max_file_bytes + 1)
    if len(data) > s.max_file_bytes:
        raise HTTPException(413, f"File is too large. The limit is {s.max_file_mb} MB.")
    if len(data) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The file is empty.")
    content_type, magic = ALLOWED[ext]
    if not data.startswith(magic):  # extension must match the real file contents
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"This file doesn't look like a valid {ext.upper()} document.")

    doc_id = _uuid()
    key = build_key(user.firebase_uid, doc_id, filename)
    doc = Document(id=doc_id, user_id=user.id, filename=filename[:512], file_type=ext, file_size=len(data),
                   s3_key=key, status=STATUS_PROCESSING)
    db.add(doc)
    db.commit()

    try:
        get_storage().upload(key, data, content_type)
    except StorageError as e:
        db.delete(doc)
        db.commit()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))

    background.add_task(process_document, doc.id)  # swap for a Celery/RQ/SQS enqueue later
    return document_out(doc)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(doc: Document = Depends(get_owned_document)):
    return document_out(doc)


@router.get("/{document_id}/download")
def download_document(doc: Document = Depends(get_owned_document), user: User = Depends(get_current_user)):
    try:
        assert_key_owned(doc.s3_key, user.firebase_uid)
        data = get_storage().download(doc.s3_key)
    except StorageError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))
    safe = doc.filename.replace('"', "")
    return Response(content=data, media_type=ALLOWED[doc.file_type][0],
                    headers={"Content-Disposition": f'attachment; filename="{safe}"'})


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(doc: Document = Depends(get_owned_document), user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Deletes the S3 object, the Qdrant vectors, the chat history and the DB row - in that order,
    so a failure never leaves vectors or files behind without a database record pointing at them."""
    try:
        assert_key_owned(doc.s3_key, user.firebase_uid)
        get_storage().delete(doc.s3_key)
    except StorageError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))
    try:
        vector_store.delete_document_vectors(user.id, doc.id)
    except Exception:
        logger.exception("Qdrant delete failed for document %s", doc.id)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not remove the document's search index. Please try again.")
    db.delete(doc)  # cascades to chat sessions + messages
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
