export type Role = {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  description: string;
  achievements: string[];
  metrics: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  outcomes: string[];
  metrics: string;
  link?: string;
  startDate: string;
  endDate: string | null;
  reflection: string;
};

export type Skill = {
  id: string;
  name: string;
  category: "Technical" | "Soft" | "Domain";
  proficiency: 1 | 2 | 3 | 4 | 5;
  relatedProjectIds: string[];
  relatedRoleIds: string[];
};

export type Course = {
  id: string;
  name: string;
  provider: string;
  dateCompleted: string;
  certificateUrl?: string;
  learnings: string;
  grade?: string;
};

export type Achievement = {
  id: string;
  title: string;
  type: "Award" | "Publication" | "Recognition" | "Competition";
  date: string;
  details: string;
  proofUrl?: string;
};

export type FileEntry = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
};

export type LinkEntry = {
  id: string;
  title: string;
  url: string;
};

export type OtherEntry = {
  id: string;
  title: string;
  category: "Experience" | "Personal Work" | "Summit" | "Conference" | "Note" | "Other";
  date?: string;
  location?: string;
  details: string;
  link?: string;
  tags: string[];
};


export type Template = {
  id: string;
  type: "cv" | "cover_letter";
  fileName: string;
  uploadedAt: string;
  url: string;
};

export type ParsedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  requiredSkills: string[];
  responsibilities: string[];
  keywords: string[];
  yearsRequired: string;
  fullDescription: string;
};

export type MatchAnalysis = {
  score: number;
  matchedSkills: string[];
  skillGaps: string[];
  relevantProjectIds: string[];
  relevantRoleIds: string[];
};

export type Application = {
  id: string;
  jobTitle: string;
  company: string;
  dateApplied: string;
  status: "Applied" | "Interview" | "Rejected" | "Offer" | "Ghosted";
  cvVersion: string;
  notes: string;
  matchScore?: number;
};

export type ProfileInfo = {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  avatarUrl?: string;
};

export type AnalyticsSummary = {
  totalApplications: number;
  averageMatchScore: number;
  statusBreakdown: Record<Application["status"], number>;
};

export type SkillTrend = { skill: string; count: number };

export type ProjectUsage = { projectId: string; title: string; usageCount: number };

export type VelocityPoint = { week: string; count: number };

export type AuthUser = { id: string; login: string; avatar?: string };

export type AuthTokenResponse = { token: string; user: AuthUser };
