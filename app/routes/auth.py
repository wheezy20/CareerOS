from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Awaitable, Callable, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AuthUser

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
JWT_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days

SUPPORTED_PROVIDERS = ("github", "google")


class CodeExchangeRequest(BaseModel):
    code: str
    # Required for Google (its token endpoint validates this matches the
    # authorize-step redirect_uri exactly); GitHub's adapter ignores it.
    redirect_uri: str | None = None


class UserOut(BaseModel):
    id: str
    login: str
    avatar: str | None = None


class CallbackResponse(BaseModel):
    status: Literal["approved", "pending"]
    token: str | None = None
    user: UserOut | None = None


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


def get_current_user_id(request: Request, db: Session = Depends(get_db)) -> str:
    """The single auth dependency every protected route depends on, directly
    or via the router-level gate in app/main.py.

    Deliberately a dependency, not raw ASGI middleware: raising HTTPException
    here goes through FastAPI's normal exception handling, which sits inside
    CORSMiddleware — so the resulting 401 still gets CORS headers attached.
    A short-circuiting middleware placed outside CORSMiddleware would return
    a 401 with no CORS headers, which browsers surface as an opaque network
    error instead of a readable 401.

    Re-checks the AuthUser row fresh from the DB on every call — never trusts
    status from the JWT payload itself, since the JWT is only re-minted at
    login. Without this DB lookup, revoking a user's approval would have no
    effect until their existing 7-day token expired. FastAPI caches this
    dependency's result per request (same callable), so declaring it both at
    router level and on individual route handlers costs one DB query, not two.
    """
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(AuthUser).filter(AuthUser.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    if user.status != "approved":
        raise HTTPException(status_code=403, detail="Account is not approved")

    return user.id


@dataclass
class NormalizedUser:
    """The shape every provider adapter normalizes its OAuth user info into."""

    id: str
    login: str
    avatar_url: str | None


async def _github_adapter(code: str, redirect_uri: str | None) -> NormalizedUser:
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
        )
        token_data = token_res.json()
        # TEMPORARY DIAGNOSTIC LOGGING — remove once the prod 400 is root-caused.
        redacted = {k: ("***REDACTED***" if k == "access_token" else v) for k, v in token_data.items()}
        logger.warning(
            "GitHub token exchange: http_status=%s code_prefix=%s body=%s",
            token_res.status_code, code[:6], redacted,
        )
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

    return NormalizedUser(id=str(gh_user["id"]), login=gh_user["login"], avatar_url=gh_user.get("avatar_url"))


async def _google_adapter(code: str, redirect_uri: str | None) -> NormalizedUser:
    if not redirect_uri:
        raise HTTPException(status_code=400, detail="redirect_uri is required for Google sign-in")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=token_data.get("error_description", "Google exchange failed"))

        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user")
        g_user = user_res.json()

    # Google's "sub" is the stable unique account id; there's no GitHub-style
    # "login" handle, so email is the closest normalized analogue.
    return NormalizedUser(id=g_user["sub"], login=g_user.get("email", g_user["sub"]), avatar_url=g_user.get("picture"))


_PROVIDER_ADAPTERS: dict[str, Callable[[str, str | None], Awaitable[NormalizedUser]]] = {
    "github": _github_adapter,
    "google": _google_adapter,
}


def _resolve_auth_user(db: Session, provider: str, normalized: NormalizedUser) -> AuthUser:
    """Find-or-create the AuthUser row for this (provider, id), applying the
    same "single owner, then a pending queue" rule the old single-provider
    GitHub-only logic used — just generalized across providers.
    """
    if provider == "github" and settings.allowed_github_username:
        if normalized.login.lower() != settings.allowed_github_username.lower():
            raise HTTPException(status_code=403, detail="This account is not authorized for this instance")
        existing = db.query(AuthUser).filter(AuthUser.provider == provider, AuthUser.id == normalized.id).first()
        if existing is not None:
            return existing
        new_user = AuthUser(
            id=normalized.id, provider=provider, login=normalized.login,
            avatar_url=normalized.avatar_url, status="approved",
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    existing = db.query(AuthUser).filter(AuthUser.provider == provider, AuthUser.id == normalized.id).first()
    if existing is not None:
        return existing

    # First account ever, on any provider, becomes the approved owner —
    # matches the old "whoever logs in first" GitHub-only behavior. Every
    # account after that starts pending until approved (currently: manually,
    # by updating this row directly — no admin UI yet).
    no_users_yet = db.query(AuthUser).first() is None
    new_user = AuthUser(
        id=normalized.id, provider=provider, login=normalized.login,
        avatar_url=normalized.avatar_url, status="approved" if no_users_yet else "pending",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/callback/{provider}", response_model=CallbackResponse)
async def oauth_callback(provider: str, payload: CodeExchangeRequest, db: Session = Depends(get_db)) -> CallbackResponse:
    adapter = _PROVIDER_ADAPTERS.get(provider)
    if adapter is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider: {provider!r}. Use one of {SUPPORTED_PROVIDERS}.",
        )

    normalized = await adapter(payload.code, payload.redirect_uri)
    user = _resolve_auth_user(db, provider, normalized)

    if user.status != "approved":
        return CallbackResponse(status="pending")

    jwt_token = _mint_token(user.id)
    return CallbackResponse(
        status="approved",
        token=jwt_token,
        user=UserOut(id=user.id, login=user.login, avatar=user.avatar_url),
    )


@router.get("/me", response_model=UserOut)
def me(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)) -> UserOut:
    owner = db.query(AuthUser).filter(AuthUser.id == user_id).first()
    if owner is None:
        raise HTTPException(status_code=401, detail="User not found")
    return UserOut(id=owner.id, login=owner.login, avatar=owner.avatar_url)


@router.post("/logout")
def logout() -> dict[str, bool]:
    # Stateless JWT: nothing to invalidate server-side. The client drops its copy.
    return {"ok": True}
