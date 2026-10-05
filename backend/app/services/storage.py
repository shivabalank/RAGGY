"""File storage abstraction. Production = Amazon S3 (s3_service.py). Development = local disk (no AWS needed).

Object keys always look like:  users/{firebase_uid}/documents/{document_id}/{filename}
and every read/delete re-checks that the key belongs to the requesting user.
"""
import logging
import re
import threading
from abc import ABC, abstractmethod
from pathlib import PurePosixPath
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


class StorageError(Exception):
    pass


def safe_filename(name: str) -> str:
    name = PurePosixPath(name.replace("\\", "/")).name  # strip any path
    name = re.sub(r"[^\w.\- ]", "_", name).strip(" .") or "file"
    return name[:150]


def build_key(firebase_uid: str, document_id: str, filename: str) -> str:
    return f"users/{firebase_uid}/documents/{document_id}/{safe_filename(filename)}"


def assert_key_owned(key: str, firebase_uid: str) -> None:
    """Defence in depth: refuse to touch any object outside this user's own prefix."""
    if ".." in key or not key.startswith(f"users/{firebase_uid}/"):
        raise StorageError("Access to this file is not allowed.")


class Storage(ABC):
    @abstractmethod
    def upload(self, key: str, data: bytes, content_type: str) -> None: ...

    @abstractmethod
    def download(self, key: str) -> bytes: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...

    def presigned_url(self, key: str, expires: int = 300) -> Optional[str]:
        return None  # only meaningful for S3


_storage: Optional[Storage] = None
_lock = threading.Lock()


def get_storage() -> Storage:
    global _storage
    if _storage is None:
        with _lock:
            if _storage is None:
                s = get_settings()
                if s.storage_backend.lower() == "s3":
                    from app.services.s3_service import S3Storage

                    _storage = S3Storage()
                else:
                    from app.services.local_storage import LocalStorage

                    _storage = LocalStorage()
    return _storage
