from __future__ import annotations

import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Template
from app.schemas import TemplateSchema

router = APIRouter(tags=["templates"])

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
    stored_name = f"{uuid.uuid4().hex[:8]}{suffix}"
    saved_path = UPLOAD_DIR / stored_name

    with saved_path.open("wb") as handle:
        handle.write(file.file.read())

    uploaded_at = datetime.utcnow().strftime("%Y-%m-%d")
    record = Template(
        type=kind,
        file_name=file.filename or stored_name,
        uploaded_at=uploaded_at,
        url=f"/uploads/{stored_name}",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(Template).filter(Template.id == template_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)
