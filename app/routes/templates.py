from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Template
from app.schemas import TemplateSchema
from app.services.storage_service import generate_signed_url, upload_bytes

router = APIRouter(tags=["templates"])

# app/main.py imports UPLOAD_DIR to mount a static /uploads route. Template
# files are no longer written to local disk (they go to GCS instead), but
# the directory constant stays so that mount doesn't break on startup.
UPLOAD_DIR = Path("/tmp/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("", response_model=list[TemplateSchema], response_model_by_alias=True)
def list_templates(db: Session = Depends(get_db)) -> list[Template]:
    return db.query(Template).all()


@router.post("", response_model=TemplateSchema, response_model_by_alias=True)
def upload_template(
    kind: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Template:
    if kind not in {"cv", "cover_letter"}:
        raise HTTPException(status_code=400, detail="kind must be 'cv' or 'cover_letter'")

    suffix = Path(file.filename or "template").suffix or ".bin"
    object_path = f"templates/{uuid.uuid4().hex[:8]}{suffix}"
    upload_bytes(object_path, file.file.read(), content_type=file.content_type)

    uploaded_at = datetime.utcnow().strftime("%Y-%m-%d")
    record = Template(
        type=kind,
        file_name=file.filename or object_path,
        uploaded_at=uploaded_at,
        url=object_path,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{template_id}/download")
def download_template(template_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    obj = db.query(Template).filter(Template.id == template_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="Template not found")
    try:
        url = generate_signed_url(obj.url)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"url": url}


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(Template).filter(Template.id == template_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)
