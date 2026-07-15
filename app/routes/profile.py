from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile
from app.schemas import ProfileSchema

router = APIRouter(tags=["profile"])


@router.get("", response_model=ProfileSchema, response_model_by_alias=True)
def get_profile(db: Session = Depends(get_db)) -> Profile:
    profile = db.query(Profile).filter(Profile.id == "me").first()
    if profile is None:
        # No row yet (fresh install / first run) — hand back an empty, unsaved
        # profile instead of 404ing, so the frontend can render the form.
        return Profile(id="me", name="", email="", phone="", linkedin="", location="", avatar_url=None)
    return profile


@router.post("", response_model=ProfileSchema, response_model_by_alias=True)
def save_profile(payload: ProfileSchema, db: Session = Depends(get_db)) -> Profile:
    profile = db.query(Profile).filter(Profile.id == "me").first()
    if profile is None:
        profile = Profile(id="me")
        db.add(profile)

    for key, value in payload.model_dump(by_alias=False, exclude_none=False).items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile
