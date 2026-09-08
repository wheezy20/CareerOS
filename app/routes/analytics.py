from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.routes.auth import get_current_user_id
from app.services.analytics_service import (
    get_application_velocity,
    get_project_usage,
    get_skill_trends,
    get_summary_stats,
)

router = APIRouter(tags=["analytics"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> dict:
    return get_summary_stats(db, user_id)


@router.get("/skills")
def skills(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> list[dict]:
    return get_skill_trends(db, user_id)


@router.get("/projects")
def projects(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> list[dict]:
    return get_project_usage(db, user_id)


@router.get("/velocity")
def velocity(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> list[dict]:
    return get_application_velocity(db, user_id)
