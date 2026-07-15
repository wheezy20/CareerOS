from __future__ import annotations

import os
from datetime import timedelta

from google.cloud import storage

GCS_BUCKET = os.environ.get("GCS_BUCKET", "careeros-uploads-502418")
SIGNED_URL_EXPIRY = timedelta(minutes=15)

_client: storage.Client | None = None


def _get_client() -> storage.Client:
    """Lazily create the storage client so importing this module never
    requires credentials to be present (e.g. at test-collection time)."""
    global _client
    if _client is None:
        _client = storage.Client()
    return _client


def upload_bytes(object_path: str, data: bytes, content_type: str | None = None) -> str:
    """Upload raw bytes to the configured private bucket at object_path.

    Returns object_path unchanged, so callers can store it directly (e.g. in
    a DB `url` column) and later hand it back to generate_signed_url.
    """
    bucket = _get_client().bucket(GCS_BUCKET)
    blob = bucket.blob(object_path)
    blob.upload_from_string(data, content_type=content_type)
    return object_path


def generate_signed_url(object_path: str, expiry: timedelta = SIGNED_URL_EXPIRY) -> str:
    """Generate a short-lived (~15 min) signed GET URL for object_path.

    The bucket is private — this is the only supported way to read an
    object back out. Uses the ambient Application Default Credentials
    (Cloud Run's attached service account); no key file is required, but
    that service account does need iam.serviceAccounts.signBlob on itself
    for V4 signing to succeed.
    """
    bucket = _get_client().bucket(GCS_BUCKET)
    blob = bucket.blob(object_path)
    try:
        return blob.generate_signed_url(version="v4", expiration=expiry, method="GET")
    except Exception as exc:
        raise RuntimeError(
            f"Failed to generate a signed URL for '{object_path}' in bucket '{GCS_BUCKET}': {exc}"
        ) from exc
