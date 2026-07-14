from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class RoleSchema(CamelModel):
    id: Optional[str] = None
    title: str
    company: str
    start_date: str
    end_date: Optional[str] = None
    description: str
    achievements: List[str] = []
    metrics: str = ""


class ProjectSchema(CamelModel):
    id: Optional[str] = None
    title: str
    description: str
    technologies: List[str] = []
    outcomes: List[str] = []
    metrics: str = ""
    link: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    reflection: str = ""


class SkillSchema(CamelModel):
    id: Optional[str] = None
    name: str
    category: Literal["Technical", "Soft", "Domain"]
    proficiency: int
    related_project_ids: List[str] = []
    related_role_ids: List[str] = []


class CourseSchema(CamelModel):
    id: Optional[str] = None
    name: str
    provider: str
    date_completed: str
    certificate_url: Optional[str] = None
    learnings: str = ""
    grade: Optional[str] = None


class AchievementSchema(CamelModel):
    id: Optional[str] = None
    title: str
    type: Literal["Award", "Publication", "Recognition", "Competition"]
    date: str
    details: str = ""
    proof_url: Optional[str] = None


class FileEntrySchema(CamelModel):
    id: Optional[str] = None
    name: str
    size: int
    type: str
    url: str
    uploaded_at: str


class LinkEntrySchema(CamelModel):
    id: Optional[str] = None
    title: str
    url: str


class OtherEntrySchema(CamelModel):
    id: Optional[str] = None
    title: str
    category: Literal["Experience", "Personal Work", "Summit", "Conference", "Note", "Other"]
    date: Optional[str] = None
    location: Optional[str] = None
    details: str = ""
    link: Optional[str] = None
    tags: List[str] = []


class ApplicationSchema(CamelModel):
    id: Optional[str] = None
    job_title: str
    company: str
    date_applied: str
    status: Literal["Applied", "Interview", "Rejected", "Offer", "Ghosted"]
    cv_version: str = ""
    notes: str = ""
    match_score: Optional[int] = None


class ProfileSchema(CamelModel):
    name: str
    email: str
    phone: str
    linkedin: str
    location: str
    avatar_url: Optional[str] = None


class TemplateSchema(CamelModel):
    id: Optional[str] = None
    type: Literal["cv", "cover_letter"]
    file_name: str
    uploaded_at: str
    url: str


class ParsedJobSchema(CamelModel):
    id: Optional[str] = None
    title: str
    company: str
    location: str
    required_skills: List[str] = []
    responsibilities: List[str] = []
    keywords: List[str] = []
    years_required: str = ""
    full_description: str = ""


class MatchAnalysisSchema(CamelModel):
    score: int
    matched_skills: List[str] = []
    skill_gaps: List[str] = []
    relevant_project_ids: List[str] = []
    relevant_role_ids: List[str] = []
