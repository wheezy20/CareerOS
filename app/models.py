from __future__ import annotations

import uuid

from sqlalchemy import Column, Integer, JSON, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def gen_id():
    return uuid.uuid4().hex[:8]


class Role(Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True, default=gen_id)
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
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    proficiency = Column(Integer, nullable=False)
    related_project_ids = Column(JSON, nullable=False, default=list)
    related_role_ids = Column(JSON, nullable=False, default=list)


class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    date_completed = Column(String, nullable=False)
    certificate_url = Column(String, nullable=True)
    learnings = Column(Text, nullable=False, default="")
    grade = Column(String, nullable=True)


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)
    date = Column(String, nullable=False)
    details = Column(Text, nullable=False, default="")
    proof_url = Column(String, nullable=True)


class FileEntry(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    url = Column(String, nullable=False)
    uploaded_at = Column(String, nullable=False)


class LinkEntry(Base):
    __tablename__ = "links"

    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)


class OtherEntry(Base):
    __tablename__ = "others"

    id = Column(String, primary_key=True, default=gen_id)
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
    job_title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    date_applied = Column(String, nullable=False)
    status = Column(String, nullable=False)
    cv_version = Column(String, nullable=False, default="")
    notes = Column(Text, nullable=False, default="")
    match_score = Column(Integer, nullable=True)


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    uploaded_at = Column(String, nullable=False)
    url = Column(String, nullable=False)


class Profile(Base):
    __tablename__ = "profile"

    id = Column(String, primary_key=True, default="me")
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
    job_id = Column(String, nullable=False)
    project_ids = Column(JSON, nullable=False, default=list)
    generated_at = Column(String, nullable=False)


class AuthUser(Base):
    """The single allowed owner of this personal instance.

    Populated by whichever GitHub account completes OAuth first, unless
    ALLOWED_GITHUB_USERNAME is set in the environment — in that case the
    login check uses that instead and this table is informational only.
    """

    __tablename__ = "auth_users"

    id = Column(String, primary_key=True)  # GitHub user id, as a string
    login = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
