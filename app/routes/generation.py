from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from docx import Document
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Achievement, Course, GeneratedCv, ParsedJob, Profile, Project, Role, Skill, Template
from app.schemas import ParsedJobSchema
from app.services.document_service import (
    customize_cv_text,
    generate_cold_email,
    generate_cover_letter,
    generate_cv_docx,
    _build_user_profile_json,
)
from app.services.error_handlers import ClaudeAPIError, TemplateError

router = APIRouter(tags=["generation"])

logger = logging.getLogger(__name__)

_FALLBACK_BULLETS = ["Drove adoption of new engineering practices across the team."]
_FALLBACK_LETTER_TEXT = (
    "I would welcome the opportunity to discuss how my background could contribute to your team. "
    "Would you have 15 minutes this week to talk further?"
)
_FALLBACK_EMAIL_TEXT = (
    "Hi there, your team's work caught my attention and I'd love to learn more about what you're building. "
    "Would you have 15 minutes this week to connect?"
)


def _write_minimal_fallback_docx(text: str, output_path: Path) -> str:
    """Last-resort document writer used when even the deterministic fallback path fails.

    Deliberately does nothing but construct a blank Document and save one paragraph —
    no template loading, no Claude calls, nothing that could itself raise — so a route
    that reaches this can still guarantee a 200 with a valid, openable DOCX.
    """
    doc = Document()
    doc.add_paragraph(text)
    doc.save(str(output_path))
    return str(output_path)


ROOT_DIR = Path(__file__).resolve().parents[2]
GENERATED_DIR = ROOT_DIR / "data" / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


def _find_job(db: Session, job_id: str) -> ParsedJob:
    job = db.query(ParsedJob).filter(ParsedJob.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Parsed job not found")
    return job


def _find_profile_context(db: Session) -> dict[str, Any]:
    profile = db.query(Profile).filter(Profile.id == "me").first()
    roles = db.query(Role).all()
    projects = db.query(Project).all()
    skills = db.query(Skill).all()
    courses = db.query(Course).all()
    achievements = db.query(Achievement).all()
    return _build_user_profile_json(
        profile=profile,
        roles=roles,
        projects=projects,
        skills=skills,
        courses=courses,
        achievements=achievements,
    )


def _resolve_template_path(db: Session, kind: str) -> Path:
    # Template.id is a random UUID hex, not time-ordered, so sorting by it does not
    # give the most recent upload. Row insertion order (SQLite's implicit rowid,
    # returned when no ORDER BY is applied) does.
    templates = db.query(Template).filter(Template.type == kind).all()
    if not templates:
        return Path("")

    candidate = (ROOT_DIR / templates[-1].url.lstrip("/")).resolve()
    if candidate.exists():
        return candidate
    return Path("")


@router.post("/generate/cv")
def generate_cv(payload: dict[str, str], db: Session = Depends(get_db)) -> dict[str, str]:
    job_id = payload.get("jobId") or payload.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="jobId is required")

    job = _find_job(db, job_id)
    profile_context = _find_profile_context(db)
    parsed_job = ParsedJobSchema.model_validate(job).model_dump(by_alias=True)
    output_name = f"cv_{job_id}_{uuid.uuid4().hex[:8]}.docx"
    output_path = GENERATED_DIR / output_name

    # customize_cv_text / generate_cv_docx already convert Claude/template failures
    # into deterministic fallbacks internally and don't raise — this is a second,
    # redundant safety net so this route can never return a 5xx either way.
    try:
        customized_bullets = customize_cv_text(profile_context, parsed_job)
        template_path = _resolve_template_path(db, "cv")
        generated_path = generate_cv_docx(
            str(template_path) if template_path.exists() else "", customized_bullets, str(output_path)
        )
    except (TemplateError, ClaudeAPIError) as exc:
        logger.warning("generate_cv hit %s; writing minimal fallback document", exc)
        generated_path = _write_minimal_fallback_docx("\n".join(_FALLBACK_BULLETS), output_path)
    except Exception as exc:
        logger.error("generate_cv unexpected failure: %s; writing minimal fallback document", exc)
        generated_path = _write_minimal_fallback_docx("\n".join(_FALLBACK_BULLETS), output_path)

    project_ids = [project.id for project in db.query(Project).all()]
    db.add(GeneratedCv(
        job_id=job_id,
        project_ids=project_ids,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    ))
    db.commit()

    version = f"v1-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}"
    return {"url": f"/generated/{output_name}", "version": version, "path": generated_path}


@router.post("/generate/cover-letter")
def generate_cover_letter_endpoint(payload: dict[str, str], db: Session = Depends(get_db)) -> dict[str, str]:
    job_id = payload.get("jobId") or payload.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="jobId is required")

    job = _find_job(db, job_id)
    profile_context = _find_profile_context(db)
    parsed_job = ParsedJobSchema.model_validate(job).model_dump(by_alias=True)
    output_name = f"cover-letter_{job_id}_{uuid.uuid4().hex[:8]}.docx"
    output_path = GENERATED_DIR / output_name

    try:
        template_path = _resolve_template_path(db, "cover_letter")
        generated_path = generate_cover_letter(
            profile_context, parsed_job, str(template_path) if template_path.exists() else "", str(output_path)
        )
    except (TemplateError, ClaudeAPIError) as exc:
        logger.warning("generate_cover_letter hit %s; writing minimal fallback document", exc)
        generated_path = _write_minimal_fallback_docx(_FALLBACK_LETTER_TEXT, output_path)
    except Exception as exc:
        logger.error("generate_cover_letter unexpected failure: %s; writing minimal fallback document", exc)
        generated_path = _write_minimal_fallback_docx(_FALLBACK_LETTER_TEXT, output_path)

    version = f"v1-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}"
    return {"url": f"/generated/{output_name}", "version": version, "path": generated_path}


@router.post("/generate/cold-email")
def generate_cold_email_endpoint(payload: dict[str, str], db: Session = Depends(get_db)) -> dict[str, str]:
    job_id = payload.get("jobId") or payload.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="jobId is required")

    job = _find_job(db, job_id)
    profile_context = _find_profile_context(db)
    parsed_job = ParsedJobSchema.model_validate(job).model_dump(by_alias=True)

    try:
        email_text = generate_cold_email(profile_context, parsed_job)
    except ClaudeAPIError as exc:
        logger.warning("generate_cold_email hit %s; using minimal fallback text", exc)
        email_text = _FALLBACK_EMAIL_TEXT
    except Exception as exc:
        logger.error("generate_cold_email unexpected failure: %s; using minimal fallback text", exc)
        email_text = _FALLBACK_EMAIL_TEXT

    return {"text": email_text}
