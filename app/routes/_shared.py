from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import AuthUser


def current_owner_id(db: Session) -> str:
    """Interim single-owner shim: several tables now have a NOT NULL user_id,
    but routes aren't scoped to the authenticated caller yet (separate future
    phase), so every insert is attributed to the instance's one existing
    account."""
    owner = db.query(AuthUser).first()
    if owner is None:
        raise HTTPException(status_code=500, detail="No owner account configured")
    return owner.id
