from __future__ import annotations

import logging
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from docx import Document
from fastapi import APIRouter, Depends, HTTPException
from google.cloud import storage
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


def _latest_template(db: Session, kind: str) -> Template | None:
    # Template.id is a random UUID hex, not time-ordered, so sorting by it does not
    # give the most recent upload. Row insertion order (SQLite's implicit rowid,
    # returned when no ORDER BY is applied) does.
    templates = db.query(Template).filter(Template.type == kind).all()
    return templates[-1] if templates else None


def _resolve_template_path(template: Template | None) -> bytes:
    """Fetch a template's file bytes from GCS (templates live in the private
    bucket now, not on local disk — see app/services/storage_service.py).

    Returns empty bytes — the caller's signal to fall back to a blank
    template — when no template is provided, or when the GCS fetch fails
    for any reason (missing object, auth error, etc.). Never raises, to
    preserve the existing graceful-degrade behavior.
    """
    if template is None:
        return b""

    bucket_name = os.environ.get("GCS_BUCKET", "careeros-uploads-502418")
    try:
        client = storage.Client()
        blob = client.bucket(bucket_name).blob(template.url)
        return blob.download_as_bytes()
    except Exception as exc:
        logger.error("Failed to fetch template %r from GCS bucket %r: %s", template.url, bucket_name, exc)
        return b""


def _write_temp_template(data: bytes, filename: str = "") -> str:
    """Bridge GCS-fetched template bytes into the existing str-path-based
    docx loading pipeline (app/services/document_service.py) without
    changing that pipeline. Returns "" (meaning "no template") for empty
    bytes, matching what that pipeline already treats as "use blank"."""
    if not data:
        return ""
    suffix = Path(filename).suffix if filename and Path(filename).suffix else ".docx"
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        tmp.write(data)
    finally:
        tmp.close()
    return tmp.name


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
    template_path = ""
    try:
        customized_bullets = customize_cv_text(profile_context, parsed_job)
        tmpl = _latest_template(db, "cv")
        template_bytes = _resolve_template_path(tmpl)
        template_path = _write_temp_template(template_bytes, tmpl.file_name if tmpl else "")
        generated_path = generate_cv_docx(template_path, customized_bullets, str(output_path))
    except (TemplateError, ClaudeAPIError) as exc:
        logger.warning("generate_cv hit %s; writing minimal fallback document", exc)
        generated_path = _write_minimal_fallback_docx("\n".join(_FALLBACK_BULLETS), output_path)
    except Exception as exc:
        logger.error("generate_cv unexpected failure: %s; writing minimal fallback document", exc)
        generated_path = _write_minimal_fallback_docx("\n".join(_FALLBACK_BULLETS), output_path)
    finally:
        if template_path:
            os.unlink(template_path)

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

    template_path = ""
    try:
        tmpl = _latest_template(db, "cover_letter")
        template_bytes = _resolve_template_path(tmpl)
        template_path = _write_temp_template(template_bytes, tmpl.file_name if tmpl else "")
        generated_path = generate_cover_letter(profile_context, parsed_job, template_path, str(output_path))
    except (TemplateError, ClaudeAPIError) as exc:
        logger.warning("generate_cover_letter hit %s; writing minimal fallback document", exc)
        generated_path = _write_minimal_fallback_docx(_FALLBACK_LETTER_TEXT, output_path)
    except Exception as exc:
        logger.error("generate_cover_letter unexpected failure: %s; writing minimal fallback document", exc)
        generated_path = _write_minimal_fallback_docx(_FALLBACK_LETTER_TEXT, output_path)
    finally:
        if template_path:
            os.unlink(template_path)

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
