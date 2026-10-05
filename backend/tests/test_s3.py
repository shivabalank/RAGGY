import boto3
import pytest
from moto import mock_aws

from app.services.storage import StorageError


@mock_aws
def test_s3_upload_download_delete(monkeypatch):
    from app.config import get_settings
    s = get_settings()
    monkeypatch.setattr(s, "s3_bucket_name", "raggy-test")
    monkeypatch.setattr(s, "aws_access_key_id", "x")
    monkeypatch.setattr(s, "aws_secret_access_key", "y")
    monkeypatch.setattr(s, "aws_region", "us-east-1")
    boto3.client("s3", region_name="us-east-1").create_bucket(Bucket="raggy-test")

    from app.services.s3_service import S3Storage
    st = S3Storage()
    key = "users/uid-alice/documents/d1/a.pdf"
    st.upload(key, b"hello", "application/pdf")
    assert st.download(key) == b"hello"
    assert "X-Amz-Signature" in st.presigned_url(key)
    st.delete(key)
    with pytest.raises(StorageError):
        st.download(key)
