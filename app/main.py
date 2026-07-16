import os

import sentry_sdk

_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
        # Capture 100% of errors; no performance tracing to keep it free/simple
        traces_sample_rate=0.0,
        send_default_pii=False,
    )

from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routes.analytics import router as analytics_router
from app.routes.applications import router as applications_router
from app.routes.auth import require_auth, router as auth_router
from app.routes.generation import ROOT_DIR, router as generation_router
from app.routes.job import router as job_router
from app.routes.knowledge_base import router as knowledge_base_router
from app.routes.profile import router as profile_router
from app.routes.templates import UPLOAD_DIR, router as templates_router

app = FastAPI(title="CareerOS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
        "https://career-os-seven-eta.vercel.app",
        "https://careeros-production-ecef.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

protected = [Depends(require_auth)]

GENERATED_DIR = ROOT_DIR / "data" / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")

app.include_router(auth_router, prefix="/api/auth")
app.include_router(knowledge_base_router, prefix="/api/knowledge-base", dependencies=protected)
app.include_router(applications_router, prefix="/api/applications", dependencies=protected)
app.include_router(profile_router, prefix="/api/profile", dependencies=protected)
app.include_router(templates_router, prefix="/api/templates", dependencies=protected)
app.include_router(generation_router, prefix="/api", dependencies=protected)
app.include_router(job_router, prefix="/api", dependencies=protected)
app.include_router(analytics_router, prefix="/api/analytics", dependencies=protected)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


init_db()
