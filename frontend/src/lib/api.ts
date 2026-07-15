/**
 * API client for the CareerOS FastAPI backend.
 *
 * All endpoints are relative to VITE_API_BASE_URL (default: /api).
 * Set USE_MOCKS to true to fall back to static mock data instead of
 * hitting the real backend.
 */
import * as mock from "./mock-data";
import type {
  Role, Project, Skill, Course, Achievement, FileEntry, LinkEntry, OtherEntry,
  Application, ProfileInfo, ParsedJob, MatchAnalysis, Template,
  AnalyticsSummary, SkillTrend, ProjectUsage, VelocityPoint,
  AuthUser, AuthTokenResponse,
} from "./types";
import { clearToken, getToken } from "./auth";


const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
const USE_MOCKS = false;

function delay<T>(v: T, ms = 250): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
}

function id() {
  return Math.random().toString(36).slice(2, 10);
}

async function fetchJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const init: RequestInit = { method, headers };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, init);
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---------- Knowledge Base ----------
export const api = {
  base: BASE,

  // Roles
  async listRoles(): Promise<Role[]> { return USE_MOCKS ? delay([...mock.mockRoles]) : fetchJson("GET", "/knowledge-base/roles"); },
  async saveRole(role: Omit<Role, "id"> & { id?: string }): Promise<Role> {
    return USE_MOCKS ? delay({ ...role, id: role.id ?? id() } as Role) : fetchJson("POST", "/knowledge-base/roles", role);
  },
  async deleteRole(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/knowledge-base/roles/${id_}`);
  },

  // Projects
  async listProjects(): Promise<Project[]> { return USE_MOCKS ? delay([...mock.mockProjects]) : fetchJson("GET", "/knowledge-base/projects"); },
  async saveProject(p: Omit<Project, "id"> & { id?: string }): Promise<Project> {
    return USE_MOCKS ? delay({ ...p, id: p.id ?? id() } as Project) : fetchJson("POST", "/knowledge-base/projects", p);
  },
  async deleteProject(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/knowledge-base/projects/${id_}`);
  },

  // Skills
  async listSkills(): Promise<Skill[]> { return USE_MOCKS ? delay([...mock.mockSkills]) : fetchJson("GET", "/knowledge-base/skills"); },
  async saveSkill(s: Omit<Skill, "id"> & { id?: string }): Promise<Skill> {
    return USE_MOCKS ? delay({ ...s, id: s.id ?? id() } as Skill) : fetchJson("POST", "/knowledge-base/skills", s);
  },
  async deleteSkill(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/knowledge-base/skills/${id_}`);
  },

  // Courses
  async listCourses(): Promise<Course[]> { return USE_MOCKS ? delay([...mock.mockCourses]) : fetchJson("GET", "/knowledge-base/courses"); },
  async saveCourse(c: Omit<Course, "id"> & { id?: string }): Promise<Course> {
    return USE_MOCKS ? delay({ ...c, id: c.id ?? id() } as Course) : fetchJson("POST", "/knowledge-base/courses", c);
  },
  async deleteCourse(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/knowledge-base/courses/${id_}`);
  },

  // Achievements
  async listAchievements(): Promise<Achievement[]> { return USE_MOCKS ? delay([...mock.mockAchievements]) : fetchJson("GET", "/knowledge-base/achievements"); },
  async saveAchievement(a: Omit<Achievement, "id"> & { id?: string }): Promise<Achievement> {
    return USE_MOCKS ? delay({ ...a, id: a.id ?? id() } as Achievement) : fetchJson("POST", "/knowledge-base/achievements", a);
  },
  async deleteAchievement(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/knowledge-base/achievements/${id_}`);
  },

  // Files & Links
  // TODO: needs backend GET /knowledge-base/files endpoint
  async listFiles(): Promise<FileEntry[]> { return delay([...mock.mockFiles]); },
  async uploadFile(file: File): Promise<FileEntry> {
    if (USE_MOCKS) {
      return delay({
        id: id(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString().slice(0, 10),
      });
    }
    const form = new FormData();
    form.append("file", file);
    return fetchJson("POST", "/knowledge-base/files", form);
  },
  async deleteFile(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/knowledge-base/files/${id_}`);
  },

  async listLinks(): Promise<LinkEntry[]> { return USE_MOCKS ? delay([...mock.mockLinks]) : fetchJson("GET", "/knowledge-base/links"); },
  async saveLink(l: Omit<LinkEntry, "id"> & { id?: string }): Promise<LinkEntry> {
    return USE_MOCKS ? delay({ ...l, id: l.id ?? id() } as LinkEntry) : fetchJson("POST", "/knowledge-base/links", l);
  },
  async deleteLink(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/knowledge-base/links/${id_}`);
  },

  // Others (misc experiences, personal works, summits, conferences, notes)
  async listOthers(): Promise<OtherEntry[]> { return USE_MOCKS ? delay([...mock.mockOthers]) : fetchJson("GET", "/knowledge-base/others"); },
  async saveOther(o: Omit<OtherEntry, "id"> & { id?: string }): Promise<OtherEntry> {
    return USE_MOCKS ? delay({ ...o, id: o.id ?? id() } as OtherEntry) : fetchJson("POST", "/knowledge-base/others", o);
  },
  async deleteOther(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/knowledge-base/others/${id_}`);
  },


  // Templates
  async listTemplates(): Promise<Template[]> { return USE_MOCKS ? delay([]) : fetchJson("GET", "/templates"); },
  async uploadTemplate(kind: "cv" | "cover_letter", file: File): Promise<Template> {
    return delay({
      id: id(),
      type: kind,
      fileName: file.name,
      uploadedAt: new Date().toISOString().slice(0, 10),
      url: URL.createObjectURL(file),
    });
  },
  async deleteTemplate(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/templates/${id_}`);
  },

  // Job pipeline
  async parseJobFromPDF(file: File): Promise<ParsedJob> {
    if (USE_MOCKS) return delay({ ...mock.mockParsedJob, id: id() }, 900);
    const form = new FormData();
    form.append("file", file);
    return fetchJson("POST", "/job/parse/pdf", form);
  },
  async parseJobFromURL(url: string): Promise<ParsedJob> {
    return USE_MOCKS ? delay({ ...mock.mockParsedJob, id: id() }, 900) : fetchJson("POST", "/job/parse/url", { url });
  },
  async parseJobFromText(text: string): Promise<ParsedJob> {
    return USE_MOCKS ? delay({ ...mock.mockParsedJob, id: id() }, 700) : fetchJson("POST", "/job/parse/text", { text });
  },
  async analyzeMatch(jobId: string): Promise<MatchAnalysis> {
    return USE_MOCKS ? delay(mock.mockMatch, 600) : fetchJson("POST", `/job/${jobId}/analyze`);
  },

  async generateCV(jobId: string): Promise<{ url: string; version: string }> {
    return USE_MOCKS
      ? delay({ url: "#", version: `v${Math.floor(Math.random() * 90) + 10}` }, 1400)
      : fetchJson("POST", "/generate/cv", { jobId });
  },
  async generateCoverLetter(jobId: string): Promise<{ url: string }> {
    return USE_MOCKS ? delay({ url: "#" }, 1200) : fetchJson("POST", "/generate/cover-letter", { jobId });
  },
  async generateColdEmail(jobId: string): Promise<{ text: string }> {
    if (USE_MOCKS) {
      return delay({
        text: `Hi [Hiring Manager],\n\nI came across the ${mock.mockParsedJob.title} role at ${mock.mockParsedJob.company} and it lines up closely with what I've been building for the past few years.\n\nMost relevant to your team: I recently shipped a realtime dashboard used by 12k+ weekly users and cut onboarding time by 42% at Northwind Labs. Happy to share a short walkthrough if useful.\n\nWould love 15 minutes next week to explore fit.\n\nEyram`,
      }, 900);
    }
    return fetchJson("POST", "/generate/cold-email", { jobId });
  },

  // Applications
  async listApplications(): Promise<Application[]> { return USE_MOCKS ? delay([...mock.mockApplications]) : fetchJson("GET", "/applications"); },
  async saveApplication(a: Omit<Application, "id"> & { id?: string }): Promise<Application> {
    return USE_MOCKS ? delay({ ...a, id: a.id ?? id() } as Application) : fetchJson("POST", "/applications", a);
  },
  async deleteApplication(id_: string): Promise<void> {
    return USE_MOCKS ? delay(undefined) : fetchJson("DELETE", `/applications/${id_}`);
  },

  // Profile
  async getProfile(): Promise<ProfileInfo> { return USE_MOCKS ? delay({ ...mock.mockProfile }) : fetchJson("GET", "/profile"); },
  async saveProfile(p: ProfileInfo): Promise<ProfileInfo> {
    return USE_MOCKS ? delay(p) : fetchJson("POST", "/profile", p);
  },

  // Analytics
  async getAnalyticsSummary(): Promise<AnalyticsSummary> { return fetchJson("GET", "/analytics/summary"); },
  async getAnalyticsSkills(): Promise<SkillTrend[]> { return fetchJson("GET", "/analytics/skills"); },
  async getAnalyticsProjects(): Promise<ProjectUsage[]> { return fetchJson("GET", "/analytics/projects"); },
  async getAnalyticsVelocity(): Promise<VelocityPoint[]> { return fetchJson("GET", "/analytics/velocity"); },

  // Auth
  async exchangeGithubCode(code: string): Promise<AuthTokenResponse> { return fetchJson("POST", "/auth/callback", { code }); },
  async getMe(): Promise<AuthUser> { return fetchJson("GET", "/auth/me"); },
  async logout(): Promise<void> { await fetchJson("POST", "/auth/logout"); },
};
