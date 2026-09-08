from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, gen_id
from app.routes.auth import get_current_user_id
from app.schemas import ProfileSchema

router = APIRouter(tags=["profile"])


@router.get("", response_model=ProfileSchema, response_model_by_alias=True)
def get_profile(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if profile is None:
        # No row yet for this user (first visit) — create and persist a blank
        # one rather than 404ing, so every downstream "a profile exists"
        # assumption (generation.py, job.py) holds without special-casing.
        profile = Profile(
            id=gen_id(), user_id=user_id, name="", email="", phone="", linkedin="",
            portfolio_url="", github_url="", location="", avatar_url=None,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.post("", response_model=ProfileSchema, response_model_by_alias=True)
def save_profile(
    payload: ProfileSchema, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)
) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if profile is None:
        profile = Profile(id=gen_id(), user_id=user_id)
        db.add(profile)

    for key, value in payload.model_dump(by_alias=False, exclude_none=False).items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile
