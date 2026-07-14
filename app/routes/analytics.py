from __future__ import annotations

from fastapi import APIRouter

from app.services.analytics_service import (
    get_application_velocity,
    get_project_usage,
    get_skill_trends,
    get_summary_stats,
)

router = APIRouter(tags=["analytics"])


@router.get("/summary")
def summary() -> dict:
    return get_summary_stats()


@router.get("/skills")
def skills() -> list[dict]:
    return get_skill_trends()


@router.get("/projects")
def projects() -> list[dict]:
    return get_project_usage()


@router.get("/velocity")
def velocity() -> list[dict]:
    return get_application_velocity()
