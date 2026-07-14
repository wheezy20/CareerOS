from __future__ import annotations

import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AuthUser

router = APIRouter(tags=["auth"])

JWT_ALGORITHM = "HS256"
JWT_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days


class CodeExchangeRequest(BaseModel):
    code: str


class UserOut(BaseModel):
    id: str
    login: str
    avatar: str | None = None


class TokenResponse(BaseModel):
    token: str
    user: UserOut


def _mint_token(user_id: str) -> str:
    now = int(time.time())
    payload = {"sub": user_id, "iat": now, "exp": now + JWT_TTL_SECONDS}
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def try_decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


def extract_token(request: Request) -> str | None:
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:]
    return request.cookies.get("careeros_token")


def get_current_user(request: Request) -> dict:
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(token)


def require_auth(request: Request) -> None:
    """FastAPI dependency gate for protected routers.

    Deliberately a dependency, not raw ASGI middleware: raising HTTPException
    here goes through FastAPI's normal exception handling, which sits inside
    CORSMiddleware — so the resulting 401 still gets CORS headers attached.
    A short-circuiting middleware placed outside CORSMiddleware would return
    a 401 with no CORS headers, which browsers surface as an opaque network
    error instead of a readable 401.
    """
    token = extract_token(request)
    if not token or try_decode_token(token) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")


def _check_allowed(db: Session, github_id: str, login: str, avatar_url: str | None) -> None:
    """Enforce single-user access: either the configured username, or whoever logs in first."""
    if settings.allowed_github_username:
        if login.lower() != settings.allowed_github_username.lower():
            raise HTTPException(status_code=403, detail="This account is not authorized for this instance")
        return

    owner = db.query(AuthUser).first()
    if owner is None:
        db.add(AuthUser(id=github_id, login=login, avatar_url=avatar_url))
        db.commit()
    elif owner.id != github_id:
        raise HTTPException(status_code=403, detail="This account is not authorized for this instance")


@router.post("/callback", response_model=TokenResponse)
async def github_callback(payload: CodeExchangeRequest, db: Session = Depends(get_db)) -> TokenResponse:
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": payload.code,
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=token_data.get("error_description", "GitHub exchange failed"))

        user_res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub user")
        gh_user = user_res.json()

    github_id = str(gh_user["id"])
    login = gh_user["login"]
    avatar_url = gh_user.get("avatar_url")

    _check_allowed(db, github_id, login, avatar_url)

    jwt_token = _mint_token(github_id)
    return TokenResponse(token=jwt_token, user=UserOut(id=github_id, login=login, avatar=avatar_url))


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> UserOut:
    owner = db.query(AuthUser).filter(AuthUser.id == user["sub"]).first()
    if owner is None:
        raise HTTPException(status_code=401, detail="User not found")
    return UserOut(id=owner.id, login=owner.login, avatar=owner.avatar_url)


@router.post("/logout")
def logout() -> dict[str, bool]:
    # Stateless JWT: nothing to invalidate server-side. The client drops its copy.
    return {"ok": True}
