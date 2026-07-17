from __future__ import annotations

import json

CV_CUSTOMIZATION_PROMPT = """You are an elite career coach writing a resume for a job application.

User's Profile:

Roles:
{roles}

Projects:
{projects}

Courses:
{courses}

Achievements:
{achievements}

Skills:
{skills}

Target Job:
Title: {job_title}
Company: {job_company}
Required Skills: {job_required_skills}
Keywords: {job_keywords}
Responsibilities: {job_responsibilities}
Years Required: {job_years_required}

Your task:
1. Identify the 3-4 most relevant roles/projects from the user's profile that match the job's requiredSkills and keywords.
2. For EACH selected role/project, rewrite the user's bullet points to:
   - Use job-specific keywords and terminology
   - ALWAYS include concrete metrics (from the user's profile data):
     * If user's role has metrics='15% fewer errors', output that
     * If project has metrics='500K users impacted', use it
     * If outcomes mention 'scaled to 1M', quantify it
     * If achievement says 'promoted', note timing/scope
   - Format as: [Action verb] [what] [how/scale] [metric/impact]
     Example: 'Led 5-engineer team over 3 months to ship fraud-detection ML pipeline, improving alert accuracy by 28% and reducing false positives by 40%'
   - Prioritize impact over process
3. If a role/project lacks metrics, infer from context or note as 'drove adoption'
4. Return ONLY formatted bullet points, one per line, no preamble.

Format output as:
• [bullet 1]
• [bullet 2]
...
"""

COVER_LETTER_CUSTOMIZATION_PROMPT = """You are an elite cover letter writer. Write a personalized cover letter that:

User's Profile:
{profile_context}

Target Job:
{job_context}

Cover Letter Template:
{template_text}

Your task:
1. Open with a hook that references the COMPANY NAME and specific ROLE, not a generic line such as 'I am excited to apply for this position'.
2. Write 2-3 body paragraphs that weave in the user's most relevant projects and achievements.
3. Lead each paragraph with the problem the company faces (from the job description), then show how the user solved a similar problem from their profile.
4. Include at least one concrete metric from the user's work (for example '500K users', '28% improvement', '$2M ARR', '3 projects shipped in parallel').
5. If the job mentions values such as fast-paced, data-driven, or collaborative, echo them with proof from the user's background.
6. Close with a specific call to action that feels concrete and tailored to the target role, not generic.
7. Follow the structure of the provided template, preserving the letterhead, greeting, closing, and signature cues.

Return ONLY the body text as readable prose, no bullets, no markdown, no subject line.
"""

COLD_EMAIL_PROMPT = """You are an expert cold-email writer. Write a short, punchy email that:

User's Profile:
{profile_context}

Target Job:
{job_context}

Your task:
1. Write a personalized subject line idea that references the company and a specific product or problem, but do not include it in the output.
2. Write a body of about 100 words total.
3. Open with a personalized hook that mentions the company by name and a specific detail about what they do or why it matters.
4. Include one clear achievement with a metric.
5. Close with a specific CTA such as 'Would you have 15 min Thursday or Friday to discuss [specific area]?' instead of a generic coffee invitation.
6. Keep the tone warm, authentic, and peer-like rather than salesy.

Return ONLY the email body, no subject line, no bullets, no markdown.
"""


CV_STRUCTURED_PROMPT = """You are an elite resume writer producing a fully structured CV as JSON.

User's Profile:

Contact Info (the ONLY source of truth for the "name" and "contact" fields):
{profile_contact}

Roles:
{roles}

Projects:
{projects}

Courses:
{courses}

Achievements:
{achievements}

Skills:
{skills}

Target Job:
Title: {job_title}
Company: {job_company}
Required Skills: {job_required_skills}
Keywords: {job_keywords}
Responsibilities: {job_responsibilities}

Template structure (use this as your guide for section order — do not invent sections the template doesn't have, do not drop sections it does have; use empty lists for sections with no content):
{template_text}

Your task:
1. Use the template structure above as your guide for section order — don't invent sections it doesn't have, don't drop sections it does have; use empty lists for sections with no content.
2. Pull all real content ONLY from the User's Profile above (roles, projects, skills, courses, achievements). Never invent facts, companies, dates, or metrics.
3. Tailor the content to the Target Job (title, required skills, keywords, responsibilities) — emphasize the most relevant roles, projects, and skills.
4. If the Target Job's domain doesn't closely match the user's roles/projects, explicitly reframe the closest matching experience in terms of transferable skills relevant to the job, rather than forcing in an unrelated bullet.
5. Limit each role's bullets to at most 3 — select only the strongest and most job-relevant achievements. Do not pad with weaker bullets to reach 3.
6. Never use em dashes (—) or en dashes (–) anywhere in the output — use commas, semicolons, colons, or hyphens (-) instead.
7. Build the "contact" field ONLY from the Contact Info block above (location, phone, email, linkedin, portfolio, github), pipe-separated (" | "), omitting any field that is empty. Do NOT pull contact details from the template structure, even if it shows different or additional contact information — the template is a structural guide only, never a source of facts.

The "leadership" field covers: volunteering, summits/conferences attended or presented at, poster presentations, awards and achievements, and certifications.

Return ONLY valid JSON (no markdown code fences, no preamble, no commentary) matching EXACTLY this shape:
{{
  "name": "string",
  "contact": "string (location | phone | email | linkedin | portfolio | github, omitting empty fields)",
  "education": [{{"school": "", "degree": "", "dates": "", "location": ""}}],
  "skills": {{"category name": ["skill", "skill"]}},
  "experience": [{{"role": "", "company": "", "dates": "", "location": "", "bullets": ["", ""]}}],
  "projects": [{{"name": "", "description": ""}}],
  "leadership": [""]
}}
"""


def build_cv_customization_prompt(profile: dict, job: dict) -> str:
    return CV_CUSTOMIZATION_PROMPT.format(
        roles=json.dumps(profile.get("roles", []), indent=2),
        projects=json.dumps(profile.get("projects", []), indent=2),
        courses=json.dumps(profile.get("courses", []), indent=2),
        achievements=json.dumps(profile.get("achievements", []), indent=2),
        skills=json.dumps(profile.get("skills", []), indent=2),
        job_title=job.get("title", ""),
        job_company=job.get("company", ""),
        job_required_skills=json.dumps(job.get("requiredSkills", [])),
        job_keywords=json.dumps(job.get("keywords", [])),
        job_responsibilities=json.dumps(job.get("responsibilities", [])),
        job_years_required=job.get("yearsRequired", ""),
    )


def build_cv_structured_prompt(user_profile_json: dict, parsed_job: dict, template_text: str) -> str:
    return CV_STRUCTURED_PROMPT.format(
        profile_contact=json.dumps(user_profile_json.get("profile", {}), indent=2),
        roles=json.dumps(user_profile_json.get("roles", []), indent=2),
        projects=json.dumps(user_profile_json.get("projects", []), indent=2),
        courses=json.dumps(user_profile_json.get("courses", []), indent=2),
        achievements=json.dumps(user_profile_json.get("achievements", []), indent=2),
        skills=json.dumps(user_profile_json.get("skills", []), indent=2),
        job_title=parsed_job.get("title", ""),
        job_company=parsed_job.get("company", ""),
        job_required_skills=json.dumps(parsed_job.get("requiredSkills", [])),
        job_keywords=json.dumps(parsed_job.get("keywords", [])),
        job_responsibilities=json.dumps(parsed_job.get("responsibilities", [])),
        template_text=template_text or "No template structure provided — use a standard CV section order (summary, experience, education, skills, projects).",
    )


def build_cover_letter_customization_prompt(profile: dict, job: dict, template_text: str) -> str:
    return COVER_LETTER_CUSTOMIZATION_PROMPT.format(
        profile_context=json.dumps(profile, indent=2),
        job_context=json.dumps(job, indent=2),
        template_text=template_text or "Use a standard professional cover letter layout.",
    )


def build_cold_email_prompt(profile: dict, job: dict) -> str:
    return COLD_EMAIL_PROMPT.format(
        profile_context=json.dumps(profile, indent=2),
        job_context=json.dumps(job, indent=2),
    )
