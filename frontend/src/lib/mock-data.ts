import type {
  Role, Project, Skill, Course, Achievement, FileEntry, LinkEntry, OtherEntry,
  Application, ProfileInfo, ParsedJob, MatchAnalysis,
} from "./types";


export const mockProfile: ProfileInfo = {
  name: "Eyram",
  email: "eyram@example.com",
  phone: "+1 555 0100",
  linkedin: "https://linkedin.com/in/eyram",
  portfolioUrl: "https://eyram.dev",
  githubUrl: "https://github.com/eyram",
  location: "Remote · Worldwide",
};

export const mockRoles: Role[] = [
  {
    id: "r1",
    title: "Senior Product Engineer",
    company: "Northwind Labs",
    startDate: "2023-01",
    endDate: null,
    description: "Leading full-stack product development for the analytics platform.",
    achievements: [
      "Cut onboarding time by 42% via redesigned setup flow",
      "Shipped realtime dashboards used by 12k+ weekly active users",
    ],
    metrics: "12k WAU · 42% faster onboarding · $180k ARR influenced",
  },
  {
    id: "r2",
    title: "Software Engineer",
    company: "Blueprint Studio",
    startDate: "2020-06",
    endDate: "2022-12",
    description: "Built customer-facing web apps across the stack.",
    achievements: [
      "Rewrote payment pipeline, reducing errors by 76%",
      "Mentored 4 junior engineers",
    ],
    metrics: "76% fewer payment errors",
  },
];

export const mockProjects: Project[] = [
  {
    id: "p1",
    title: "CareerOS",
    description: "Personal tool for customizing CVs and cover letters against job descriptions.",
    technologies: ["React", "TypeScript", "FastAPI", "PostgreSQL"],
    outcomes: ["Automated ~80% of tailoring work", "Increased response rate 3x"],
    metrics: "3x response rate",
    link: "https://github.com/eyram/careeros",
    startDate: "2025-06",
    endDate: null,
    reflection: "Learned a lot about prompt engineering and structured LLM outputs.",
  },
  {
    id: "p2",
    title: "Realtime Analytics Engine",
    description: "Event stream processor with sub-second aggregation.",
    technologies: ["Rust", "Kafka", "ClickHouse"],
    outcomes: ["Handles 2M events/min", "P99 < 400ms"],
    metrics: "2M events/min",
    startDate: "2022-03",
    endDate: "2022-11",
    reflection: "Backpressure is the whole game.",
  },
];

export const mockSkills: Skill[] = [
  { id: "s1", name: "React", category: "Technical", proficiency: 5, relatedProjectIds: ["p1"], relatedRoleIds: ["r1", "r2"] },
  { id: "s2", name: "TypeScript", category: "Technical", proficiency: 5, relatedProjectIds: ["p1"], relatedRoleIds: ["r1"] },
  { id: "s3", name: "Python / FastAPI", category: "Technical", proficiency: 4, relatedProjectIds: ["p1"], relatedRoleIds: [] },
  { id: "s4", name: "PostgreSQL", category: "Technical", proficiency: 4, relatedProjectIds: ["p1", "p2"], relatedRoleIds: ["r1"] },
  { id: "s5", name: "Product Thinking", category: "Soft", proficiency: 4, relatedProjectIds: [], relatedRoleIds: ["r1"] },
  { id: "s6", name: "Fintech", category: "Domain", proficiency: 3, relatedProjectIds: [], relatedRoleIds: ["r2"] },
];

export const mockCourses: Course[] = [
  {
    id: "c1",
    name: "Advanced Distributed Systems",
    provider: "MIT OpenCourseWare",
    dateCompleted: "2024-04",
    learnings: "CRDTs, consensus, event sourcing",
    grade: "A",
  },
];

export const mockAchievements: Achievement[] = [
  {
    id: "a1",
    title: "Winner · Global Hack 2024",
    type: "Competition",
    date: "2024-08",
    details: "1st place out of 320 teams for a climate risk visualization tool.",
  },
];

export const mockFiles: FileEntry[] = [
  {
    id: "f1",
    name: "portfolio-2025.pdf",
    size: 1_240_000,
    type: "application/pdf",
    url: "#",
    uploadedAt: "2025-05-10",
  },
];

export const mockLinks: LinkEntry[] = [
  { id: "l1", title: "GitHub", url: "https://github.com/eyram" },
  { id: "l2", title: "Personal Site", url: "https://eyram.dev" },
];

export const mockOthers: OtherEntry[] = [
  {
    id: "o1",
    title: "Speaker · Africa AI Summit 2025",
    category: "Summit",
    date: "2025-03",
    location: "Accra, Ghana",
    details: "Panel on applied LLMs for developer productivity. ~400 attendees.",
    tags: ["AI", "public speaking"],
  },
  {
    id: "o2",
    title: "Volunteer mentor · Local coding bootcamp",
    category: "Experience",
    date: "2024-09",
    details: "Weekly 1:1s with 6 junior devs on React and career growth.",
    tags: ["mentorship"],
  },
];


export const mockApplications: Application[] = [
  {
    id: "app1",
    jobTitle: "Senior Frontend Engineer",
    company: "Linear",
    dateApplied: "2025-06-20",
    status: "Interview",
    cvVersion: "v3 · Linear-tailored",
    notes: "Recruiter reached out 3 days after applying.",
    matchScore: 88,
  },
  {
    id: "app2",
    jobTitle: "Staff Product Engineer",
    company: "Vercel",
    dateApplied: "2025-06-15",
    status: "Applied",
    cvVersion: "v3 · edge-focused",
    notes: "",
    matchScore: 74,
  },
  {
    id: "app3",
    jobTitle: "Full Stack Engineer",
    company: "Height",
    dateApplied: "2025-06-01",
    status: "Rejected",
    cvVersion: "v2",
    notes: "Fit was off — role skewed backend.",
    matchScore: 62,
  },
  {
    id: "app4",
    jobTitle: "Founding Engineer",
    company: "Craft",
    dateApplied: "2025-05-24",
    status: "Offer",
    cvVersion: "v3 · early-stage",
    notes: "Received offer, negotiating.",
    matchScore: 91,
  },
];

export const mockParsedJob: ParsedJob = {
  id: "job-mock",
  title: "Senior Frontend Engineer",
  company: "Linear",
  location: "Remote (Global)",
  requiredSkills: ["React", "TypeScript", "GraphQL", "Design systems", "Performance"],
  responsibilities: [
    "Build core product features end-to-end",
    "Own performance and quality of the web app",
    "Collaborate closely with design and product",
  ],
  keywords: ["velocity", "craft", "opinionated", "ownership"],
  yearsRequired: "5+ years",
  fullDescription: "We are looking for a senior frontend engineer to help shape the next generation of Linear...",
};

export const mockMatch: MatchAnalysis = {
  score: 88,
  matchedSkills: ["React", "TypeScript", "PostgreSQL"],
  skillGaps: ["GraphQL", "Design systems (formal)"],
  relevantProjectIds: ["p1", "p2"],
  relevantRoleIds: ["r1"],
};
