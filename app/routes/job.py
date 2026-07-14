from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ParsedJob, Profile, Project, Role, Skill
from app.schemas import MatchAnalysisSchema, ParsedJobSchema
from app.services.claude_service import (
    build_profile_context,
    compute_match_analysis,
    parse_job_description,
)
from app.services.document_service import extract_pdf_text, extract_url_text
from app.services.error_handlers import PDFExtractionError, URLFetchError

router = APIRouter(tags=["job"])

logger = logging.getLogger(__name__)


def _save_parsed_job(db: Session, parsed: ParsedJobSchema) -> ParsedJob:
    record = ParsedJob(
        title=parsed.title,
        company=parsed.company,
        location=parsed.location,
        required_skills=parsed.required_skills,
        responsibilities=parsed.responsibilities,
        keywords=parsed.keywords,
        years_required=parsed.years_required,
        full_description=parsed.full_description,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/job/parse/pdf", response_model=ParsedJobSchema, response_model_by_alias=True)
async def parse_job_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)) -> ParsedJob:
    contents = await file.read()
    try:
        text = extract_pdf_text(contents)
    except PDFExtractionError as exc:
        logger.error("PDF extraction failed for upload %r: %s", file.filename, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # parse_job_description never raises — on a Claude failure it returns a
    # deterministic keyword-scan ParsedJobSchema that still carries the real
    # extracted text, so the caller always gets something usable.
    parsed = parse_job_description(text)
    return _save_parsed_job(db, parsed)


@router.post("/job/parse/url", response_model=ParsedJobSchema, response_model_by_alias=True)
def parse_job_url(payload: dict[str, str], db: Session = Depends(get_db)) -> ParsedJob:
    url = payload.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    try:
        text = extract_url_text(url)
    except URLFetchError as exc:
        logger.error("URL fetch failed for %s: %s", url, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    parsed = parse_job_description(text)
    return _save_parsed_job(db, parsed)


@router.post("/job/parse/text", response_model=ParsedJobSchema, response_model_by_alias=True)
def parse_job_text_endpoint(payload: dict[str, str], db: Session = Depends(get_db)) -> ParsedJob:
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    parsed = parse_job_description(text)
    return _save_parsed_job(db, parsed)


@router.post("/job/{job_id}/analyze", response_model=MatchAnalysisSchema, response_model_by_alias=True)
def analyze_job(job_id: str, db: Session = Depends(get_db)) -> MatchAnalysisSchema:
    job = db.query(ParsedJob).filter(ParsedJob.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Parsed job not found")

    profile = db.query(Profile).filter(Profile.id == "me").first()
    roles = db.query(Role).all()
    projects = db.query(Project).all()
    skills = db.query(Skill).all()
    profile_context = build_profile_context(profile=profile, roles=roles, projects=projects, skills=skills)

    parsed_job = ParsedJobSchema.model_validate(job).model_dump(by_alias=True)
    return compute_match_analysis(profile_context, parsed_job)
