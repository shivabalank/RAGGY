"""Amazon S3 storage. Credentials come from env vars (or the EC2 instance's IAM role if left blank)."""
import logging
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings
from app.services.storage import Storage, StorageError

logger = logging.getLogger(__name__)


class S3Storage(Storage):
    def __init__(self) -> None:
        s = get_settings()
        if not s.s3_bucket_name:
            raise StorageError("S3_BUCKET_NAME is not set.")
        self.bucket = s.s3_bucket_name
        kwargs = {"region_name": s.aws_region, "config": Config(signature_version="s3v4")}
        if s.aws_access_key_id and s.aws_secret_access_key:
            kwargs.update(aws_access_key_id=s.aws_access_key_id, aws_secret_access_key=s.aws_secret_access_key)
        self.client = boto3.client("s3", **kwargs)

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        try:
            self.client.put_object(
                Bucket=self.bucket, Key=key, Body=data, ContentType=content_type, ServerSideEncryption="AES256"
            )
        except (ClientError, BotoCoreError) as e:
            logger.error("S3 upload failed for %s: %s", key, e)
            raise StorageError("Could not store the file. Please try again.") from e

    def download(self, key: str) -> bytes:
        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except (ClientError, BotoCoreError) as e:
            logger.error("S3 download failed for %s: %s", key, e)
            raise StorageError("Could not read the stored file.") from e

    def delete(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)  # deleting a missing key is not an error in S3
        except (ClientError, BotoCoreError) as e:
            logger.error("S3 delete failed for %s: %s", key, e)
            raise StorageError("Could not delete the stored file.") from e

    def presigned_url(self, key: str, expires: int = 300) -> Optional[str]:
        try:
            return self.client.generate_presigned_url(
                "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=expires)
        except (ClientError, BotoCoreError) as e:
            logger.error("S3 presign failed for %s: %s", key, e)
            raise StorageError("Could not create a download link.") from e
