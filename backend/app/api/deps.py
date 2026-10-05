"""Authentication + ownership dependencies. EVERY protected route uses these.

The user's identity comes ONLY from the verified Firebase ID token. Nothing the browser sends
(user id, email, ...) is trusted.
"""
import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.user import User
from app.services.database import get_db
from app.services.firebase import InvalidTokenError, verify_token

logger = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer), db: Session = Depends(get_db)
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in to continue.")
    try:
        claims = verify_token(creds.credentials)
    except InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired. Please sign in again.")

    uid = claims["uid"]
    email = claims.get("email") or ""
    name = claims.get("name") or (email.split("@")[0] if email else "")
    user = db.query(User).filter(User.firebase_uid == uid).one_or_none()
    if user is None:
        user = User(firebase_uid=uid, email=email, name=name)
        db.add(user)
        try:
            db.commit()
        except IntegrityError:  # two first requests raced; the other one won
            db.rollback()
            user = db.query(User).filter(User.firebase_uid == uid).one()
    elif (email and user.email != email) or (name and not user.name):
        user.email, user.name = email or user.email, user.name or name
        db.commit()
    return user


def get_owned_document(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Document:
    """Loads a document ONLY if it belongs to the authenticated user.

    Someone else's document and a non-existent document both return the same 404, so one user can't
    even discover that another user's document id exists.
    """
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == user.id).one_or_none()
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return doc
