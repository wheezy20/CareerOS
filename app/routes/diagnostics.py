from __future__ import annotations

import os

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import engine, get_db
from app.models import FileEntry

router = APIRouter(tags=["diagnostics"])


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)) -> dict:
    """Unauthenticated diagnostic endpoint — traces exactly which database
    the backend is actually talking to, step by step. Each check is
    independently try/excepted so one failure doesn't hide the rest.
    """
    checks: dict = {}
    all_ok = True

    try:
        db_url = os.environ.get("DATABASE_URL")
        scheme = db_url.split("://", 1)[0] if db_url and "://" in db_url else None
        checks["database_url_present"] = {"present": bool(db_url), "scheme": scheme}
    except Exception as exc:
        checks["database_url_present"] = f"error: {exc}"
        all_ok = False

    try:
        checks["engine_url_scheme"] = engine.url.drivername
    except Exception as exc:
        checks["engine_url_scheme"] = f"error: {exc}"
        all_ok = False

    try:
        db.execute(text("SELECT 1"))
        checks["connect_test"] = "ok"
    except Exception as exc:
        checks["connect_test"] = f"error: {exc}"
        all_ok = False

    try:
        checks["files_table_exists"] = db.query(FileEntry).count()
    except Exception as exc:
        checks["files_table_exists"] = f"error: {exc}"
        all_ok = False

    test_id = None
    try:
        test_row = FileEntry(
            name="diagnostic_test",
            size=0,
            type="test",
            url="test/diagnostic",
            uploaded_at="2026-01-01",
        )
        db.add(test_row)
        db.commit()
        db.refresh(test_row)
        test_id = test_row.id
        checks["insert_test"] = {"ok": True, "id": test_id}
    except Exception as exc:
        db.rollback()
        checks["insert_test"] = f"error: {exc}"
        all_ok = False

    try:
        if test_id is None:
            checks["readback_test"] = "skipped: insert_test did not produce an id"
        else:
            found = db.query(FileEntry).filter(FileEntry.id == test_id).first()
            if found is None:
                checks["readback_test"] = "error: row not found after insert"
                all_ok = False
            else:
                checks["readback_test"] = "ok"
    except Exception as exc:
        checks["readback_test"] = f"error: {exc}"
        all_ok = False

    try:
        if test_id is None:
            checks["cleanup"] = "skipped: insert_test did not produce an id"
        else:
            row = db.query(FileEntry).filter(FileEntry.id == test_id).first()
            if row is not None:
                db.delete(row)
                db.commit()
            checks["cleanup"] = "ok"
    except Exception as exc:
        db.rollback()
        checks["cleanup"] = f"error: {exc}"
        all_ok = False

    try:
        checks["current_database"] = db.execute(text("SELECT current_database()")).scalar()
    except Exception as exc:
        checks["current_database"] = f"error: {exc}"
        all_ok = False

    try:
        result = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        checks["tables_visible"] = [row[0] for row in result]
    except Exception as exc:
        checks["tables_visible"] = f"error: {exc}"
        all_ok = False

    return {"status": "ok" if all_ok else "error", "checks": checks}
