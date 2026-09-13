from __future__ import annotations

import uuid

from sqlalchemy import Column, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def gen_id():
    return uuid.uuid4().hex[:8]


class Role(Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    achievements = Column(JSON, nullable=False, default=list)
    metrics = Column(String, nullable=False, default="")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    technologies = Column(JSON, nullable=False, default=list)
    outcomes = Column(JSON, nullable=False, default=list)
    metrics = Column(String, nullable=False, default="")
    link = Column(String, nullable=True)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=True)
    reflection = Column(Text, nullable=False, default="")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    proficiency = Column(Integer, nullable=False)
    related_project_ids = Column(JSON, nullable=False, default=list)
    related_role_ids = Column(JSON, nullable=False, default=list)


class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    date_completed = Column(String, nullable=False)
    certificate_url = Column(String, nullable=True)
    learnings = Column(Text, nullable=False, default="")
    grade = Column(String, nullable=True)


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)
    date = Column(String, nullable=False)
    details = Column(Text, nullable=False, default="")
    proof_url = Column(String, nullable=True)


class FileEntry(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    url = Column(String, nullable=False)
    uploaded_at = Column(String, nullable=False)


class LinkEntry(Base):
    __tablename__ = "links"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)


class OtherEntry(Base):
    __tablename__ = "others"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    date = Column(String, nullable=True)
    location = Column(String, nullable=True)
    details = Column(Text, nullable=False, default="")
    link = Column(String, nullable=True)
    tags = Column(JSON, nullable=False, default=list)


class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    job_title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    date_applied = Column(String, nullable=False)
    status = Column(String, nullable=False)
    cv_version = Column(String, nullable=False, default="")
    notes = Column(Text, nullable=False, default="")
    match_score = Column(Integer, nullable=True)
    parsed_job_id = Column(String, ForeignKey("parsed_jobs.id"), nullable=True)
    generated_cv_id = Column(String, ForeignKey("generated_cvs.id"), nullable=True)
    cover_letter_text = Column(Text, nullable=True)
    cold_email_text = Column(Text, nullable=True)


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    uploaded_at = Column(String, nullable=False)
    url = Column(String, nullable=False)


class Profile(Base):
    __tablename__ = "profile"

    id = Column(String, primary_key=True, default="me")
    user_id = Column(String, ForeignKey("auth_users.id"), unique=True, nullable=False)
    name = Column(String, nullable=False, default="")
    email = Column(String, nullable=False, default="")
    phone = Column(String, nullable=False, default="")
    linkedin = Column(String, nullable=False, default="")
    portfolio_url = Column(String, nullable=False, default="")
    github_url = Column(String, nullable=False, default="")
    location = Column(String, nullable=False, default="")
    avatar_url = Column(String, nullable=True)


class ParsedJob(Base):
    __tablename__ = "parsed_jobs"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=False)
    required_skills = Column(JSON, nullable=False, default=list)
    responsibilities = Column(JSON, nullable=False, default=list)
    keywords = Column(JSON, nullable=False, default=list)
    years_required = Column(String, nullable=False, default="")
    full_description = Column(Text, nullable=False, default="")


class GeneratedCv(Base):
    __tablename__ = "generated_cvs"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    job_id = Column(String, nullable=False)
    project_ids = Column(JSON, nullable=False, default=list)
    generated_at = Column(String, nullable=False)
    docx_path = Column(String, nullable=True)
    pdf_path = Column(String, nullable=True)


class AuthUser(Base):
    """An account allowed to sign in, from any supported OAuth provider.

    Populated by whichever account completes OAuth first (becomes the
    approved owner), unless ALLOWED_GITHUB_USERNAME is set in the environment
    — in that case the login check uses that instead for GitHub sign-ins.
    Every account after the first owner is created with status="pending"
    and needs to be approved (currently: manually, by updating this row)
    before it can sign in — see app/routes/auth.py.
    """

    __tablename__ = "auth_users"

    id = Column(String, primary_key=True)  # the provider's user id, as a string
    provider = Column(String, nullable=False, default="github")
    login = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
