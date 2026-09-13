from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, GeneratedCv, ParsedJob
from app.routes.auth import get_current_user_id
from app.schemas import ApplicationFromPipelineSchema, ApplicationSchema, CvLinksSchema
from app.services.storage_service import generate_signed_url

router = APIRouter(tags=["applications"])


@router.get("", response_model=list[ApplicationSchema], response_model_by_alias=True)
def list_applications(
    db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)
) -> list[Application]:
    return db.query(Application).filter(Application.user_id == user_id).all()


@router.post("", response_model=ApplicationSchema, response_model_by_alias=True)
def save_application(
    payload: ApplicationSchema, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)
) -> Application:
    data = payload.model_dump(by_alias=False, exclude_none=False)
    application_id = data.get("id")

    if application_id:
        obj = db.query(Application).filter(Application.id == application_id, Application.user_id == user_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Application not found")
        for key, value in data.items():
            if key != "id":
                setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        return obj

    data.pop("id", None)
    obj = Application(user_id=user_id, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{application_id}", status_code=204)
def delete_application(
    application_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)
) -> Response:
    obj = db.query(Application).filter(Application.id == application_id, Application.user_id == user_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)


@router.post("/from-pipeline", response_model=ApplicationSchema, response_model_by_alias=True)
def save_application_from_pipeline(
    payload: ApplicationFromPipelineSchema,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> Application:
    job = db.query(ParsedJob).filter(ParsedJob.id == payload.parsed_job_id, ParsedJob.user_id == user_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Parsed job not found")

    if payload.generated_cv_id is not None:
        cv = (
            db.query(GeneratedCv)
            .filter(GeneratedCv.id == payload.generated_cv_id, GeneratedCv.user_id == user_id)
            .first()
        )
        if cv is None:
            raise HTTPException(status_code=404, detail="Generated CV not found")

    obj = Application(
        user_id=user_id,
        job_title=payload.job_title,
        company=payload.company,
        date_applied=payload.date_applied,
        status=payload.status,
        notes=payload.notes,
        parsed_job_id=payload.parsed_job_id,
        generated_cv_id=payload.generated_cv_id,
        cover_letter_text=payload.cover_letter_text,
        cold_email_text=payload.cold_email_text,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{application_id}/cv-links", response_model=CvLinksSchema, response_model_by_alias=True)
def get_application_cv_links(
    application_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)
) -> dict:
    application = (
        db.query(Application).filter(Application.id == application_id, Application.user_id == user_id).first()
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.generated_cv_id is None:
        raise HTTPException(status_code=404, detail="This application has no linked CV")

    cv = (
        db.query(GeneratedCv)
        .filter(GeneratedCv.id == application.generated_cv_id, GeneratedCv.user_id == user_id)
        .first()
    )
    if cv is None:
        raise HTTPException(status_code=404, detail="Linked CV not found")

    docx_url = None
    if cv.docx_path:
        try:
            docx_url = generate_signed_url(cv.docx_path)
        except Exception:
            docx_url = None

    pdf_url = None
    if cv.pdf_path:
        try:
            pdf_url = generate_signed_url(cv.pdf_path)
        except Exception:
            pdf_url = None

    return {"docx_url": docx_url, "pdf_url": pdf_url}
