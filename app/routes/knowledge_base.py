from __future__ import annotations

import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Type, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Achievement, Course, FileEntry, LinkEntry, OtherEntry, Project, Role, Skill
from app.schemas import (
    AchievementSchema,
    CourseSchema,
    FileEntrySchema,
    LinkEntrySchema,
    OtherEntrySchema,
    ProjectSchema,
    RoleSchema,
    SkillSchema,
)
from app.services.storage_service import generate_signed_url, upload_bytes

router = APIRouter(tags=["knowledge-base"])
logger = logging.getLogger(__name__)

ModelType = TypeVar("ModelType")
SchemaType = TypeVar("SchemaType")


def _upsert_entity(db: Session, model: Type[ModelType], schema: Type[SchemaType], payload: SchemaType) -> ModelType:
    data = payload.model_dump(by_alias=False, exclude_none=False)
    entity_id = data.get("id")

    if entity_id:
        obj = db.query(model).filter(model.id == entity_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
        for key, value in data.items():
            if key != "id":
                setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        return obj

    data.pop("id", None)
    obj = model(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/roles", response_model=list[RoleSchema], response_model_by_alias=True)
def list_roles(db: Session = Depends(get_db)) -> list[Role]:
    return db.query(Role).all()


@router.post("/roles", response_model=RoleSchema, response_model_by_alias=True)
def save_role(payload: RoleSchema, db: Session = Depends(get_db)) -> Role:
    return _upsert_entity(db, Role, RoleSchema, payload)


@router.delete("/roles/{role_id}", status_code=204)
def delete_role(role_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(Role).filter(Role.id == role_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)


@router.get("/projects", response_model=list[ProjectSchema], response_model_by_alias=True)
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return db.query(Project).all()


@router.post("/projects", response_model=ProjectSchema, response_model_by_alias=True)
def save_project(payload: ProjectSchema, db: Session = Depends(get_db)) -> Project:
    return _upsert_entity(db, Project, ProjectSchema, payload)


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(Project).filter(Project.id == project_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)


@router.get("/skills", response_model=list[SkillSchema], response_model_by_alias=True)
def list_skills(db: Session = Depends(get_db)) -> list[Skill]:
    return db.query(Skill).all()


@router.post("/skills", response_model=SkillSchema, response_model_by_alias=True)
def save_skill(payload: SkillSchema, db: Session = Depends(get_db)) -> Skill:
    return _upsert_entity(db, Skill, SkillSchema, payload)


@router.delete("/skills/{skill_id}", status_code=204)
def delete_skill(skill_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(Skill).filter(Skill.id == skill_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)


@router.get("/courses", response_model=list[CourseSchema], response_model_by_alias=True)
def list_courses(db: Session = Depends(get_db)) -> list[Course]:
    return db.query(Course).all()


@router.post("/courses", response_model=CourseSchema, response_model_by_alias=True)
def save_course(payload: CourseSchema, db: Session = Depends(get_db)) -> Course:
    return _upsert_entity(db, Course, CourseSchema, payload)


@router.delete("/courses/{course_id}", status_code=204)
def delete_course(course_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(Course).filter(Course.id == course_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)


@router.get("/achievements", response_model=list[AchievementSchema], response_model_by_alias=True)
def list_achievements(db: Session = Depends(get_db)) -> list[Achievement]:
    return db.query(Achievement).all()


@router.post("/achievements", response_model=AchievementSchema, response_model_by_alias=True)
def save_achievement(payload: AchievementSchema, db: Session = Depends(get_db)) -> Achievement:
    return _upsert_entity(db, Achievement, AchievementSchema, payload)


@router.delete("/achievements/{achievement_id}", status_code=204)
def delete_achievement(achievement_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)


@router.get("/links", response_model=list[LinkEntrySchema], response_model_by_alias=True)
def list_links(db: Session = Depends(get_db)) -> list[LinkEntry]:
    return db.query(LinkEntry).all()


@router.post("/links", response_model=LinkEntrySchema, response_model_by_alias=True)
def save_link(payload: LinkEntrySchema, db: Session = Depends(get_db)) -> LinkEntry:
    return _upsert_entity(db, LinkEntry, LinkEntrySchema, payload)


@router.delete("/links/{link_id}", status_code=204)
def delete_link(link_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(LinkEntry).filter(LinkEntry.id == link_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)


@router.get("/others", response_model=list[OtherEntrySchema], response_model_by_alias=True)
def list_others(db: Session = Depends(get_db)) -> list[OtherEntry]:
    return db.query(OtherEntry).all()


@router.post("/others", response_model=OtherEntrySchema, response_model_by_alias=True)
def save_other(payload: OtherEntrySchema, db: Session = Depends(get_db)) -> OtherEntry:
    return _upsert_entity(db, OtherEntry, OtherEntrySchema, payload)


@router.delete("/others/{other_id}", status_code=204)
def delete_other(other_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(OtherEntry).filter(OtherEntry.id == other_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)


@router.get("/files", response_model=list[FileEntrySchema], response_model_by_alias=True)
def list_files(db: Session = Depends(get_db)) -> list[FileEntry]:
    return db.query(FileEntry).all()


@router.post("/files", response_model=FileEntrySchema, response_model_by_alias=True)
def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)) -> FileEntry:
    data = file.file.read()
    suffix = Path(file.filename or "file").suffix or ".bin"
    object_path = f"files/{uuid.uuid4().hex[:8]}{suffix}"

    logger.info("upload_file: uploading object_path=%s size=%d bytes", object_path, len(data))
    upload_bytes(object_path, data, content_type=file.content_type)
    logger.info("upload_file: upload_bytes succeeded")

    payload = FileEntry(
        name=file.filename or "upload",
        size=len(data),
        type=file.content_type or "application/octet-stream",
        url=object_path,
        uploaded_at=datetime.utcnow().strftime("%Y-%m-%d"),
    )
    logger.info(
        "upload_file: FileEntry payload name=%s size=%d type=%s url=%s uploaded_at=%s",
        payload.name, payload.size, payload.type, payload.url, payload.uploaded_at,
    )

    try:
        db.add(payload)
        db.commit()
        db.refresh(payload)
        logger.info("upload_file: database commit succeeded")
    except Exception:
        logger.exception("upload_file: database operation failed")
        raise

    return payload


@router.get("/files/{file_id}/download")
def download_file(file_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    obj = db.query(FileEntry).filter(FileEntry.id == file_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        url = generate_signed_url(obj.url)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"url": url}


@router.delete("/files/{file_id}", status_code=204)
def delete_file(file_id: str, db: Session = Depends(get_db)) -> Response:
    obj = db.query(FileEntry).filter(FileEntry.id == file_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return Response(status_code=204)
