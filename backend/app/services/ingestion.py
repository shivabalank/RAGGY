"""Background document processing. Takes only a document id, so it can later be moved to Celery/RQ/SQS unchanged."""
import logging

from app.models.document import STATUS_FAILED, STATUS_PROCESSING, STATUS_READY, Document
from app.models.user import User
from app.rag import vector_store
from app.rag.loaders import ExtractionError
from app.rag.pipeline import ingest_document
from app.services.database import session_scope
from app.services.storage import StorageError, get_storage

logger = logging.getLogger(__name__)


def process_document(document_id: str) -> None:
    with session_scope() as db:
        doc = db.get(Document, document_id)
        if doc is None:
            return
        user = db.get(User, doc.user_id)
        firebase_uid, user_id = user.firebase_uid, user.id
        try:
            data = get_storage().download(doc.s3_key)
            result = ingest_document(data, doc.filename, doc.file_type, user_id=user_id, document_id=doc.id)
            db.expire_all()
            doc = db.query(Document).filter(Document.id == document_id).one_or_none()
            if doc is None:  # the user deleted it while it was being processed
                raise LookupError
            doc.status, doc.pages, doc.chunk_count, doc.error_message = (
                STATUS_READY, result["pages"], result["chunk_count"], None)
        except LookupError:
            vector_store.delete_document_vectors(user_id, document_id)
            return
        except ExtractionError as e:
            doc.status, doc.error_message = STATUS_FAILED, str(e)
            logger.warning("Extraction failed for %s: %s", document_id, e)
        except StorageError as e:
            doc.status, doc.error_message = STATUS_FAILED, str(e)
        except Exception:
            logger.exception("Processing failed for document %s", document_id)
            doc.status = STATUS_FAILED
            doc.error_message = "We couldn't index this document. Please try uploading it again."
        try:
            db.commit()
        except Exception:
            logger.exception("Could not save status for document %s", document_id)
            db.rollback()


def fail_interrupted_documents() -> None:
    """On startup: anything still 'processing' lost its worker (server restarted) - mark it failed honestly."""
    with session_scope() as db:
        stuck = db.query(Document).filter(Document.status == STATUS_PROCESSING).all()
        for d in stuck:
            d.status = STATUS_FAILED
            d.error_message = "Processing was interrupted by a server restart. Please upload the file again."
        if stuck:
            db.commit()
            logger.warning("Marked %s interrupted document(s) as failed", len(stuck))
