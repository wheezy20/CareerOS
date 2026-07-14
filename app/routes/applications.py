from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application
from app.schemas import ApplicationSchema

router = APIRouter(tags=["applications"])


@router.get("", response_model=list[ApplicationSchema], response_model_by_alias=True)
def list_applications(db: Session = Depends(get_db)) -> list[Application]:
    return db.query(Application).all()


@router.post("", response_model=ApplicationSchema, response_model_by_alias=True)
def save_application(payload: ApplicationSchema, db: Session = Depends(get_db)) -> Application:
    data = payload.model_dump(by_alias=False, exclude_none=False)
    application_id = data.get("id")

    if application_id:
        obj = db.query(Application).filter(Application.id == application_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Application not found")
        for key, value in data.items():
            if key != "id":
                setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        return obj

    data.pop("id", None)
    obj = Application(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{application_id}", status_code=204)
def delete_application(application_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(Application).filter(Application.id == application_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)
