"""Verifies the Firebase ID token the frontend sends as `Authorization: Bearer <token>`.

Two equivalent modes (both check signature, expiry, audience = your project id, and issuer):

1. Default - NO secret needed: the token is checked against Google's public Firebase signing keys
   (google-auth). This is all a backend needs to identify the user.
2. If FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY are set: the official Firebase Admin SDK is used instead.
"""
import logging
import threading
from typing import Any, Dict, Optional

import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials
from google.auth.transport import requests as g_requests
from google.oauth2 import id_token as g_id_token

from app.config import get_settings

logger = logging.getLogger(__name__)
_lock = threading.Lock()
_request: Optional[g_requests.Request] = None


class InvalidTokenError(Exception):
    pass


def _init_admin() -> None:
    if firebase_admin._apps:
        return
    with _lock:
        if firebase_admin._apps:
            return
        s = get_settings()
        cred = credentials.Certificate({
            "type": "service_account", "project_id": s.firebase_project_id,
            "client_email": s.firebase_client_email, "private_key": s.firebase_private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred, {"projectId": s.firebase_project_id})


def _verify_with_google_keys(token: str, project_id: str, request=None) -> Dict[str, Any]:
    global _request
    if request is None:
        if _request is None:
            _request = g_requests.Request()  # caches Google's public certificates
        request = _request
    claims = g_id_token.verify_firebase_token(token, request, audience=project_id, clock_skew_in_seconds=10)
    if claims.get("iss") != f"https://securetoken.google.com/{project_id}":
        raise ValueError(f"Wrong token issuer: {claims.get('iss')}")
    uid = claims.get("sub")
    if not uid or len(uid) > 128:
        raise ValueError("Token has no valid subject")
    claims["uid"] = uid
    return claims


def verify_token(id_token: str, request=None) -> Dict[str, Any]:
    """Returns the decoded claims (uid, email, name, ...). Raises InvalidTokenError on any problem."""
    s = get_settings()
    if not s.firebase_project_id:
        raise RuntimeError("FIREBASE_PROJECT_ID is not set in backend/.env")
    try:
        if s.firebase_client_email and s.firebase_private_key:
            _init_admin()
            return fb_auth.verify_id_token(id_token, clock_skew_seconds=10)
        return _verify_with_google_keys(id_token, s.firebase_project_id, request)
    except Exception as e:  # expired, malformed, wrong project, bad signature, no network ...
        logger.warning("Rejected Firebase token: %s: %s", type(e).__name__, e)
        raise InvalidTokenError(str(e)) from e
