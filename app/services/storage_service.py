from __future__ import annotations

import os
from datetime import timedelta

import google.auth
from google.auth.transport import requests as google_auth_requests
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
    object back out. Cloud Run's attached service account has no local
    private key file, so blob.generate_signed_url() can't sign locally the
    way it would with a downloaded key. Instead, this delegates signing to
    the IAM signBlob API by explicitly passing the ambient credentials'
    service account email and a fresh access token — google-cloud-storage
    detects those and uses signBlob automatically instead of local signing.
    That service account does need iam.serviceAccounts.signBlob on itself
    for this to succeed.
    """
    bucket = _get_client().bucket(GCS_BUCKET)
    blob = bucket.blob(object_path)
    try:
        credentials, _ = google.auth.default()
        # Refresh to ensure we have a valid token for IAM signBlob.
        auth_request = google_auth_requests.Request()
        credentials.refresh(auth_request)

        service_account_email = getattr(credentials, "service_account_email", None)
        if service_account_email == "default":
            # The ambient credentials didn't resolve past the GCE metadata
            # alias — ask the metadata server directly for the real email,
            # since signBlob needs the actual account, not the alias.
            from google.auth.compute_engine import _metadata

            info = _metadata.get_service_account_info(auth_request)
            service_account_email = info["email"]

        signed = blob.generate_signed_url(
            version="v4",
            expiration=expiry,
            method="GET",
            service_account_email=service_account_email,
            access_token=credentials.token,
        )
        return signed
    except Exception as exc:
        raise RuntimeError(
            f"Failed to generate a signed URL for '{object_path}' in bucket '{GCS_BUCKET}': {exc}"
        ) from exc
