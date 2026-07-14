import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import type { AnalyticsSummary, SkillTrend, ProjectUsage, VelocityPoint } from "@/lib/types";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Briefcase, Target, Zap, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Analytics · CareerOS" },
      { name: "description", content: "Insights on your job search — velocity, match scores, and skill demand." },
    ],
  }),
});

function formatWeek(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [skills, setSkills] = useState<SkillTrend[]>([]);
  const [projects, setProjects] = useState<ProjectUsage[]>([]);
  const [velocity, setVelocity] = useState<VelocityPoint[]>([]);

  useEffect(() => {
    api.getAnalyticsSummary().then(setSummary);
    api.getAnalyticsSkills().then(setSkills);
    api.getAnalyticsProjects().then(setProjects);
    api.getAnalyticsVelocity().then(setVelocity);
  }, []);

  const total = summary?.totalApplications ?? 0;
  const avgMatch = summary?.averageMatchScore ?? 0;
  const offers = summary?.statusBreakdown?.Offer ?? 0;
  const perWeek = velocity.length ? (velocity.reduce((s, v) => s + v.count, 0) / velocity.length).toFixed(1) : "0.0";

  const statusData = summary
    ? Object.entries(summary.statusBreakdown)
        .map(([name, value]) => ({ name, value }))
        .filter((d) => d.value > 0)
    : [];

  const velocityData = velocity.map((v) => ({ week: formatWeek(v.week), apps: v.count }));
  const maxUsage = Math.max(1, ...projects.map((p) => p.usageCount));

  const COLORS = ["oklch(0.72 0.11 235)", "oklch(0.78 0.14 75)", "oklch(0.62 0.22 22)", "oklch(0.68 0.14 155)", "oklch(0.65 0.16 290)"];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Analytics" description="Where you're spending effort and what's landing." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Applications" value={total} />
        <StatCard icon={Target} label="Avg match" value={`${avgMatch}%`} />
        <StatCard icon={Zap} label="Per week" value={perWeek} />
        <StatCard icon={TrendingUp} label="Offers" value={offers} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card><CardContent className="p-5">
          <h3 className="mb-4 text-sm font-medium">Most requested skills</h3>
          {skills.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No parsed jobs yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={skills}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="skill" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <h3 className="mb-4 text-sm font-medium">Application velocity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
              <Line type="monotone" dataKey="apps" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <h3 className="mb-4 text-sm font-medium">Status breakdown</h3>
          {statusData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <h3 className="mb-4 text-sm font-medium">Most used projects</h3>
          {projects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No projects logged yet.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {projects.slice(0, 5).map((p) => (
                <div key={p.projectId}>
                  <div className="flex justify-between">
                    <span>{p.title}</span>
                    <span className="text-muted-foreground">{p.usageCount}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full gradient-primary" style={{ width: `${(p.usageCount / maxUsage) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <Card><CardContent className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </CardContent></Card>
  );
}
