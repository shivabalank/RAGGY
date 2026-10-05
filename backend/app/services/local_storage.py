"""Local-disk storage for development (STORAGE_BACKEND=local). Same interface as S3Storage."""
import logging
from pathlib import Path

from app.config import get_settings
from app.services.storage import Storage, StorageError

logger = logging.getLogger(__name__)


class LocalStorage(Storage):
    def __init__(self) -> None:
        self.root = Path(get_settings().local_storage_dir).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if self.root not in p.parents:  # path-traversal guard
            raise StorageError("Invalid file path.")
        return p

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        try:
            p = self._path(key)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
        except OSError as e:
            logger.error("Local write failed for %s: %s", key, e)
            raise StorageError("Could not store the file. Please try again.") from e

    def download(self, key: str) -> bytes:
        try:
            return self._path(key).read_bytes()
        except OSError as e:
            logger.error("Local read failed for %s: %s", key, e)
            raise StorageError("Could not read the stored file.") from e

    def delete(self, key: str) -> None:
        try:
            p = self._path(key)
            p.unlink(missing_ok=True)
            for parent in (p.parent, p.parent.parent):  # tidy empty folders
                try:
                    parent.rmdir()
                except OSError:
                    break
        except OSError as e:
            logger.error("Local delete failed for %s: %s", key, e)
            raise StorageError("Could not delete the stored file.") from e
