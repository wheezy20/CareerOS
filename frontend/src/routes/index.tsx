import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { BookOpen, FileText, Sparkles, Briefcase, BarChart3, Settings, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

const sections = [
  { title: "Knowledge Base", desc: "Roles, projects, skills, courses.", to: "/knowledge", icon: BookOpen },
  { title: "Templates", desc: "Upload your CV and cover letter base.", to: "/templates", icon: FileText },
  { title: "Job Pipeline", desc: "Parse a job → tailor CV, cover letter, cold email.", to: "/pipeline", icon: Sparkles },
  { title: "Applications", desc: "Track every submission and its status.", to: "/applications", icon: Briefcase },
  { title: "Analytics", desc: "See what's actually working.", to: "/analytics", icon: BarChart3 },
  { title: "Settings", desc: "Profile, templates, export.", to: "/settings", icon: Settings },
] as const;

function Home() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Welcome back, Eyram"
        description="Your personal job application copilot. Start from your knowledge base or drop a new job description."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ title, desc, to, icon: Icon }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </div>
                <div className="mt-auto flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
