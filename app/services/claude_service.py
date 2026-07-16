from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any

from anthropic import Anthropic, APITimeoutError, AuthenticationError, RateLimitError

from app.models import Profile, Project, Role, Skill
from app.schemas import MatchAnalysisSchema, ParsedJobSchema
from app.services.error_handlers import ClaudeAPIError

CLAUDE_MODEL = "claude-sonnet-5"

logger = logging.getLogger(__name__)


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY")) if os.getenv("ANTHROPIC_API_KEY") else None

RATE_LIMIT_RETRY_SECONDS = 60


def call_claude(prompt: str, max_tokens: int) -> str:
    """Call Claude with a single retry on rate-limit and typed error translation.

    Never raises anthropic's own exceptions — always raises ClaudeAPIError so callers
    can catch one type and fall back to their deterministic response. Never crashes
    the caller; the caller decides what "usable fallback" means for its endpoint.
    """
    if client is None:
        raise ClaudeAPIError("Claude client not configured (no API key)")

    for attempt in (1, 2):
        try:
            response = client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except RateLimitError as exc:
            if attempt == 1:
                logger.warning("Claude rate-limited (429); waiting %ss before one retry", RATE_LIMIT_RETRY_SECONDS)
                time.sleep(RATE_LIMIT_RETRY_SECONDS)
                continue
            logger.error("Claude rate-limited again after retry; giving up")
            raise ClaudeAPIError("Claude API rate limit exceeded") from exc
        except AuthenticationError as exc:
            logger.error("Claude authentication failed: %s", exc)
            raise ClaudeAPIError("Invalid API key") from exc
        except APITimeoutError as exc:
            logger.error("Claude API call timed out: %s", exc)
            raise ClaudeAPIError("Claude API timeout") from exc
        except Exception as exc:
            logger.error("Claude API call failed: %s", exc)
            raise ClaudeAPIError(f"Claude API error: {exc}") from exc

    # Unreachable, but keeps type-checkers happy.
    raise ClaudeAPIError("Claude API call failed")


def _clean_json_payload(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[len("```json"):]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def build_profile_context(
    profile: Profile | None = None,
    roles: list[Role] | None = None,
    projects: list[Project] | None = None,
    skills: list[Skill] | None = None,
) -> dict[str, Any]:
    if profile is None:
        profile = Profile(id="me", name="", email="", phone="", linkedin="", location="")
    return {
        "profile": {
            "name": profile.name,
            "email": profile.email,
            "phone": profile.phone,
            "linkedin": profile.linkedin,
            "location": profile.location,
            "avatarUrl": profile.avatar_url,
        },
        "roles": [
            {
                "id": role.id,
                "title": role.title,
                "company": role.company,
                "startDate": role.start_date,
                "endDate": role.end_date,
                "description": role.description,
                "achievements": role.achievements or [],
                "metrics": role.metrics,
            }
            for role in (roles or [])
        ],
        "projects": [
            {
                "id": project.id,
                "title": project.title,
                "description": project.description,
                "technologies": project.technologies or [],
                "outcomes": project.outcomes or [],
                "metrics": project.metrics,
                "link": project.link,
                "startDate": project.start_date,
                "endDate": project.end_date,
                "reflection": project.reflection,
            }
            for project in (projects or [])
        ],
        "skills": [
            {
                "id": skill.id,
                "name": skill.name,
                "category": skill.category,
                "proficiency": skill.proficiency,
                "relatedProjectIds": skill.related_project_ids or [],
                "relatedRoleIds": skill.related_role_ids or [],
            }
            for skill in (skills or [])
        ],
    }


def _fallback_parsed_job(job_text: str) -> ParsedJobSchema:
    lowered = job_text.lower()
    skills = []
    if "python" in lowered:
        skills.append("Python")
    if "fastapi" in lowered:
        skills.append("FastAPI")
    if "sqlalchemy" in lowered:
        skills.append("SQLAlchemy")
    if "backend" in lowered:
        skills.append("Backend Development")
    return ParsedJobSchema(
        title="Software Engineer",
        company="Unknown",
        location="Remote",
        required_skills=skills,
        responsibilities=["Build and maintain backend services"],
        keywords=skills,
        years_required="3+",
        full_description=job_text,
    )


def parse_job_description(job_text: str) -> ParsedJobSchema:
    """Extract structured fields from raw job posting text using Claude.

    Never raises: any Claude failure (auth, timeout, rate limit exhausted, bad JSON)
    falls back to a deterministic keyword-scan parse that still carries the real
    extracted text through in full_description, so callers always get a usable,
    if partial, ParsedJobSchema.
    """
    prompt = f"""
You are an expert recruiter and job description analyst. Extract structured insights from the following job posting.

Return ONLY valid JSON matching this shape:
{{
  "title": "...",
  "company": "...",
  "location": "...",
  "required_skills": ["skill1", "skill2"],
  "responsibilities": ["..."],
  "keywords": ["..."],
  "years_required": "",
  "full_description": "..."
}}

Job Description:
{job_text}
"""
    try:
        raw_text = call_claude(prompt, max_tokens=1200)
        content = _clean_json_payload(raw_text)
        data = json.loads(content)
        return ParsedJobSchema(**data)
    except (ClaudeAPIError, json.JSONDecodeError, TypeError) as exc:
        logger.warning("parse_job_description falling back to keyword scan: %s", exc)
        return _fallback_parsed_job(job_text)


def compute_match_analysis(user_profile_json: dict, parsed_job: dict) -> MatchAnalysisSchema:
    """Score how well a user's profile matches a parsed job using Claude. Never raises."""
    required_skills = parsed_job.get("requiredSkills") or parsed_job.get("required_skills") or []
    fallback_matched = required_skills[:3]

    def _fallback() -> MatchAnalysisSchema:
        return MatchAnalysisSchema(
            score=60,
            matched_skills=fallback_matched,
            skill_gaps=[skill for skill in required_skills if skill not in fallback_matched],
            relevant_project_ids=[],
            relevant_role_ids=[],
        )

    prompt = f"""
You are an expert career strategist. Analyze how well this profile matches the target job.

Profile:
{json.dumps(user_profile_json, indent=2)}

Job:
{json.dumps(parsed_job, indent=2)}

Return ONLY valid JSON matching this shape:
{{
  "score": 0,
  "matched_skills": ["..."],
  "skill_gaps": ["..."],
  "relevant_project_ids": ["p1"],
  "relevant_role_ids": ["r1"]
}}
"""
    try:
        raw_text = call_claude(prompt, max_tokens=1000)
        content = _clean_json_payload(raw_text)
        data = json.loads(content)
        return MatchAnalysisSchema(**data)
    except (ClaudeAPIError, json.JSONDecodeError, TypeError) as exc:
        logger.warning("compute_match_analysis falling back to deterministic score: %s", exc)
        return _fallback()
