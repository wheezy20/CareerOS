from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import Application, GeneratedCv, ParsedJob, Project

APPLICATION_STATUSES = ["Applied", "Interview", "Rejected", "Offer", "Ghosted"]


def get_summary_stats(db: Session, user_id: str) -> dict:
    applications = db.query(Application).filter(Application.user_id == user_id).all()
    scores = [a.match_score for a in applications if a.match_score is not None]
    breakdown = {status: 0 for status in APPLICATION_STATUSES}
    for application in applications:
        breakdown[application.status] = breakdown.get(application.status, 0) + 1

    return {
        "totalApplications": len(applications),
        "averageMatchScore": round(sum(scores) / len(scores), 1) if scores else 0,
        "statusBreakdown": breakdown,
    }


def get_skill_trends(db: Session, user_id: str) -> list[dict]:
    jobs = db.query(ParsedJob).filter(ParsedJob.user_id == user_id).all()
    counts = Counter()
    for job in jobs:
        counts.update(job.required_skills or [])

    return [{"skill": skill, "count": count} for skill, count in counts.most_common(10)]


def get_project_usage(db: Session, user_id: str) -> list[dict]:
    projects = db.query(Project).filter(Project.user_id == user_id).all()
    generated_cvs = db.query(GeneratedCv).filter(GeneratedCv.user_id == user_id).all()

    usage_counts = Counter()
    for cv in generated_cvs:
        usage_counts.update(cv.project_ids or [])

    usage = [
        {"projectId": project.id, "title": project.title, "usageCount": usage_counts.get(project.id, 0)}
        for project in projects
    ]
    usage.sort(key=lambda entry: entry["usageCount"], reverse=True)
    return usage


def _week_start(day: date) -> date:
    days_since_sunday = (day.weekday() + 1) % 7
    return day - timedelta(days=days_since_sunday)


def get_application_velocity(db: Session, user_id: str) -> list[dict]:
    applications = db.query(Application).filter(Application.user_id == user_id).all()

    today = datetime.now(timezone.utc).date()
    current_week_start = _week_start(today)
    week_starts = [current_week_start - timedelta(weeks=offset) for offset in range(3, -1, -1)]
    counts = {week.isoformat(): 0 for week in week_starts}

    for application in applications:
        try:
            applied_date = datetime.strptime(application.date_applied, "%Y-%m-%d").date()
        except ValueError:
            continue
        key = _week_start(applied_date).isoformat()
        if key in counts:
            counts[key] += 1

    return [{"week": week, "count": count} for week, count in counts.items()]
