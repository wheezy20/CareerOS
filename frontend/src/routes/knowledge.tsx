import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PageHeader, EmptyState } from "@/components/page-header";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Role, Project, Skill, Course, Achievement, FileEntry, LinkEntry, OtherEntry } from "@/lib/types";
import {
  Plus, Pencil, Trash2, Briefcase, Code, Sparkles, GraduationCap,
  Trophy, Files, Link as LinkIcon, X, Upload, Download, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/knowledge")({
  component: KnowledgePage,
  head: () => ({
    meta: [
      { title: "Knowledge Base · CareerOS" },
      { name: "description", content: "Your roles, projects, skills, and achievements — the source of truth for every tailored CV." },
    ],
  }),
});

function KnowledgePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Knowledge Base"
        description="Everything you might mention in a CV. Add generously — you can pick and choose per job."
      />

      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="roles"><Briefcase className="mr-1.5 h-3.5 w-3.5" />Roles</TabsTrigger>
          <TabsTrigger value="projects"><Code className="mr-1.5 h-3.5 w-3.5" />Projects</TabsTrigger>
          <TabsTrigger value="skills"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Skills</TabsTrigger>
          <TabsTrigger value="courses"><GraduationCap className="mr-1.5 h-3.5 w-3.5" />Courses</TabsTrigger>
          <TabsTrigger value="achievements"><Trophy className="mr-1.5 h-3.5 w-3.5" />Achievements</TabsTrigger>
          <TabsTrigger value="files"><Files className="mr-1.5 h-3.5 w-3.5" />Files</TabsTrigger>
          <TabsTrigger value="links"><LinkIcon className="mr-1.5 h-3.5 w-3.5" />Links</TabsTrigger>
          <TabsTrigger value="others"><MoreHorizontal className="mr-1.5 h-3.5 w-3.5" />Others</TabsTrigger>
        </TabsList>

        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="projects"><ProjectsTab /></TabsContent>
        <TabsContent value="skills"><SkillsTab /></TabsContent>
        <TabsContent value="courses"><CoursesTab /></TabsContent>
        <TabsContent value="achievements"><AchievementsTab /></TabsContent>
        <TabsContent value="files"><FilesTab /></TabsContent>
        <TabsContent value="links"><LinksTab /></TabsContent>
        <TabsContent value="others"><OthersTab /></TabsContent>
      </Tabs>

    </div>
  );
}

// ---------- Roles ----------
function RolesTab() {
  const [items, setItems] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  useEffect(() => { api.listRoles().then(setItems); }, []);

  function onSave(role: Role) {
    api.saveRole(role).then((saved) => {
      setItems((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [saved, ...prev];
      });
      toast.success(editing ? "Role updated" : "Role added");
      setOpen(false); setEditing(null);
    });
  }

  function onDelete(id: string) {
    api.deleteRole(id).then(() => {
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast.success("Role deleted");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Add role</Button>
          </DialogTrigger>
          <RoleDialog role={editing} onSave={onSave} />
        </Dialog>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Briefcase} title="No roles yet" description="Add your work history so it can flow into any CV." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{r.title}</h3>
                    <p className="text-sm text-muted-foreground">{r.company} · {r.startDate} — {r.endDate ?? "Current"}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <p className="mt-2 text-sm">{r.description}</p>
                {r.achievements.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {r.achievements.map((a, i) => <li key={i}>• {a}</li>)}
                  </ul>
                )}
                {r.metrics && <p className="mt-3 text-xs text-primary">{r.metrics}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleDialog({ role, onSave }: { role: Role | null; onSave: (r: Role) => void }) {
  const [f, setF] = useState<Role>(role ?? {
    id: "", title: "", company: "", startDate: "", endDate: null,
    description: "", achievements: [""], metrics: "",
  });
  useEffect(() => { if (role) setF(role); }, [role]);

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{role ? "Edit role" : "Add role"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Job title</Label><Input placeholder="e.g. Data Analyst" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Company</Label><Input placeholder="e.g. Acme Inc." value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></div>
          <div><Label>Start</Label><Input type="month" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></div>
          <div><Label>End (blank = current)</Label><Input type="month" value={f.endDate ?? ""} onChange={(e) => setF({ ...f, endDate: e.target.value || null })} /></div>
        </div>
        <div><Label>Description</Label><Textarea rows={3} placeholder="e.g. Led the checkout redesign that cut cart abandonment by 18%" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div>
          <Label>Key achievements</Label>
          <div className="space-y-2 mt-1">
            {f.achievements.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="e.g. Increased test coverage from 40% to 85%" value={a} onChange={(e) => { const next = [...f.achievements]; next[i] = e.target.value; setF({ ...f, achievements: next }); }} />
                <Button variant="ghost" size="icon" onClick={() => setF({ ...f, achievements: f.achievements.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setF({ ...f, achievements: [...f.achievements, ""] })}><Plus className="h-3.5 w-3.5" />Add achievement</Button>
          </div>
        </div>
        <div><Label>Metrics</Label><Input placeholder="e.g. 42% faster · $180k ARR" value={f.metrics} onChange={(e) => setF({ ...f, metrics: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave({ ...f, achievements: f.achievements.filter(Boolean) })}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------- Projects ----------
function ProjectsTab() {
  const [items, setItems] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  useEffect(() => { api.listProjects().then(setItems); }, []);

  function onSave(p: Project) {
    api.saveProject(p).then((saved) => {
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [saved, ...prev];
      });
      toast.success("Project saved");
      setOpen(false); setEditing(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add project</Button></DialogTrigger>
          <ProjectDialog project={editing} onSave={onSave} />
        </Dialog>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Code} title="No projects yet" description="Add builds — the model uses them to prove impact." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{p.title}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { api.deleteProject(p.id).then(() => { setItems((prev) => prev.filter((x) => x.id !== p.id)); toast.success("Deleted"); }); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.technologies.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
                {p.metrics && <p className="mt-3 text-xs text-primary">{p.metrics}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDialog({ project, onSave }: { project: Project | null; onSave: (p: Project) => void }) {
  const [f, setF] = useState<Project>(project ?? {
    id: "", title: "", description: "", technologies: [], outcomes: [""], metrics: "",
    link: "", startDate: "", endDate: null, reflection: "",
  });
  const [techInput, setTechInput] = useState("");
  useEffect(() => { if (project) setF(project); }, [project]);

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{project ? "Edit project" : "Add project"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>Title</Label><Input placeholder="e.g. Personal Finance Tracker" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><Label>Description</Label><Textarea rows={3} placeholder="e.g. A web app that helps users track spending across linked accounts" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div>
          <Label>Technologies</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {f.technologies.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1">{t}<button onClick={() => setF({ ...f, technologies: f.technologies.filter((x) => x !== t) })}><X className="h-3 w-3" /></button></Badge>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input placeholder="Add tech" value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && techInput.trim()) { setF({ ...f, technologies: [...f.technologies, techInput.trim()] }); setTechInput(""); } }} />
          </div>
        </div>
        <div>
          <Label>Outcomes / impact</Label>
          <div className="space-y-2 mt-1">
            {f.outcomes.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="e.g. Reduced onboarding time by 30%" value={o} onChange={(e) => { const n = [...f.outcomes]; n[i] = e.target.value; setF({ ...f, outcomes: n }); }} />
                <Button variant="ghost" size="icon" onClick={() => setF({ ...f, outcomes: f.outcomes.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setF({ ...f, outcomes: [...f.outcomes, ""] })}><Plus className="h-3.5 w-3.5" />Add outcome</Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Metrics</Label><Input placeholder="e.g. 10k+ downloads" value={f.metrics} onChange={(e) => setF({ ...f, metrics: e.target.value })} /></div>
          <div><Label>Link</Label><Input placeholder="https://github.com/yourname/project" value={f.link ?? ""} onChange={(e) => setF({ ...f, link: e.target.value })} /></div>
          <div><Label>Start</Label><Input type="month" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></div>
          <div><Label>End</Label><Input type="month" value={f.endDate ?? ""} onChange={(e) => setF({ ...f, endDate: e.target.value || null })} /></div>
        </div>
        <div><Label>Reflection / lessons</Label><Textarea rows={2} placeholder="e.g. Would use TypeScript from day one next time" value={f.reflection} onChange={(e) => setF({ ...f, reflection: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={() => onSave({ ...f, outcomes: f.outcomes.filter(Boolean) })}>Save</Button></DialogFooter>
    </DialogContent>
  );
}

// ---------- Skills ----------
function SkillsTab() {
  const [items, setItems] = useState<Skill[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);

  useEffect(() => { api.listSkills().then(setItems); }, []);

  function save(s: Skill) {
    api.saveSkill(s).then((saved) => {
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [saved, ...prev];
      });
      toast.success("Skill saved");
      setOpen(false); setEditing(null);
    });
  }

  const grouped = items.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s); return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add skill</Button></DialogTrigger>
          <SkillDialog skill={editing} onSave={save} />
        </Dialog>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Sparkles} title="No skills yet" description="Even soft skills help the matcher." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">{cat}</h3>
              <div className="flex flex-wrap gap-2">
                {list.map((s) => (
                  <div key={s.id} className="group flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <span>{s.name}</span>
                    <Badge variant="outline" className="h-5 px-1.5 text-xs">{"★".repeat(s.proficiency)}</Badge>
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-3 w-3" /></button>
                    <button className="text-muted-foreground hover:text-destructive" onClick={() => api.deleteSkill(s.id).then(() => setItems((p) => p.filter((x) => x.id !== s.id)))}><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkillDialog({ skill, onSave }: { skill: Skill | null; onSave: (s: Skill) => void }) {
  const [f, setF] = useState<Skill>(skill ?? { id: "", name: "", category: "Technical", proficiency: 3, relatedProjectIds: [], relatedRoleIds: [] });
  useEffect(() => { if (skill) setF(skill); }, [skill]);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{skill ? "Edit skill" : "Add skill"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>Name</Label><Input placeholder="e.g. Python" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div>
          <Label>Category</Label>
          <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v as Skill["category"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Technical">Technical</SelectItem>
              <SelectItem value="Soft">Soft</SelectItem>
              <SelectItem value="Domain">Domain</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Proficiency ({f.proficiency}/5)</Label>
          <Slider min={1} max={5} step={1} value={[f.proficiency]} onValueChange={([v]) => setF({ ...f, proficiency: v as Skill["proficiency"] })} className="mt-3" />
        </div>
      </div>
      <DialogFooter><Button onClick={() => onSave(f)}>Save</Button></DialogFooter>
    </DialogContent>
  );
}

// ---------- Courses ----------
function CoursesTab() {
  const [items, setItems] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Course>({ id: "", name: "", provider: "", dateCompleted: "", learnings: "", grade: "" });
  useEffect(() => { api.listCourses().then(setItems); }, []);
  function save() { api.saveCourse(f).then((s) => { setItems((p) => [s, ...p]); toast.success("Course added"); setOpen(false); setF({ id: "", name: "", provider: "", dateCompleted: "", learnings: "", grade: "" }); }); }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add course</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add course</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input placeholder="e.g. Machine Learning Specialization" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><Label>Provider</Label><Input placeholder="e.g. Coursera" value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Completed</Label><Input type="month" value={f.dateCompleted} onChange={(e) => setF({ ...f, dateCompleted: e.target.value })} /></div>
                <div><Label>Grade</Label><Input placeholder="e.g. A or 95%" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} /></div>
              </div>
              <div><Label>Key learnings</Label><Textarea rows={3} placeholder="e.g. Built and deployed a recommendation model using collaborative filtering" value={f.learnings} onChange={(e) => setF({ ...f, learnings: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No courses yet" description="Add courses to strengthen skill claims." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <Card key={c.id}><CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.provider} · {c.dateCompleted}{c.grade && ` · ${c.grade}`}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => api.deleteCourse(c.id).then(() => setItems((p) => p.filter((x) => x.id !== c.id)))}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <p className="mt-2 text-sm">{c.learnings}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Achievements ----------
function AchievementsTab() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Achievement>({ id: "", title: "", type: "Award", date: "", details: "" });
  useEffect(() => { api.listAchievements().then(setItems); }, []);
  function save() { api.saveAchievement(f).then((s) => { setItems((p) => [s, ...p]); toast.success("Achievement added"); setOpen(false); setF({ id: "", title: "", type: "Award", date: "", details: "" }); }); }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add achievement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add achievement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input placeholder="e.g. Best Paper Award, ICML 2024" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as Achievement["type"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Award", "Publication", "Recognition", "Competition"] as const).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="month" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
              </div>
              <div><Label>Details</Label><Textarea rows={3} placeholder="e.g. Awarded for research on efficient transformer inference" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Trophy} title="No achievements yet" description="Awards, publications, competitions — anything notable." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((a) => (
            <Card key={a.id}><CardContent className="p-5 flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary"><Trophy className="h-4 w-4" /></div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{a.title}</h3>
                    <p className="text-sm text-muted-foreground">{a.type} · {a.date}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => api.deleteAchievement(a.id).then(() => setItems((p) => p.filter((x) => x.id !== a.id)))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <p className="mt-2 text-sm">{a.details}</p>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Files ----------
function FilesTab() {
  const [items, setItems] = useState<FileEntry[]>([]);
  useEffect(() => { api.listFiles().then(setItems); }, []);
  function onUpload(fs: FileList | null) {
    if (!fs) return;
    Array.from(fs).forEach((file) => api.uploadFile(file).then((f) => { setItems((p) => [f, ...p]); toast.success(`Uploaded ${f.name}`); }));
  }
  async function onDownload(f: FileEntry) {
    try {
      const token = getToken();
      const res = await fetch(`${api.base}/knowledge-base/files/${f.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Failed to get download link (${res.status})`);
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(`Couldn't download ${f.name}`);
    }
  }
  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 py-10 transition-colors hover:border-primary/40 hover:bg-accent/30">
        <Upload className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm">Drag or click to upload PDFs, images, or docs</span>
        <input type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
      </label>
      {items.length > 0 && (
        <div className="grid gap-2">
          {items.map((f) => (
            <Card key={f.id}><CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary"><Files className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB · {f.uploadedAt}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onDownload(f)}><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => api.deleteFile(f.id).then(() => setItems((p) => p.filter((x) => x.id !== f.id)))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Links ----------
function LinksTab() {
  const [items, setItems] = useState<LinkEntry[]>([]);
  const [title, setTitle] = useState(""); const [url, setUrl] = useState("");
  useEffect(() => { api.listLinks().then(setItems); }, []);
  function add() {
    if (!title || !url) return;
    api.saveLink({ title, url }).then((l) => { setItems((p) => [l, ...p]); setTitle(""); setUrl(""); toast.success("Link added"); });
  }
  return (
    <div className="space-y-4">
      <Card><CardContent className="flex gap-2 p-4">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button onClick={add}><Plus className="h-4 w-4" />Add</Button>
      </CardContent></Card>
      {items.length === 0 ? (
        <EmptyState icon={LinkIcon} title="No links yet" description="GitHub, portfolio, writing — anything you'd share." />
      ) : (
        <div className="grid gap-2">
          {items.map((l) => (
            <Card key={l.id}><CardContent className="flex items-center justify-between p-4">
              <a href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-primary">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary"><LinkIcon className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.url}</p>
                </div>
              </a>
              <Button variant="ghost" size="icon" onClick={() => api.deleteLink(l.id).then(() => setItems((p) => p.filter((x) => x.id !== l.id)))}><Trash2 className="h-4 w-4" /></Button>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Others ----------
const OTHER_CATEGORIES = ["Experience", "Personal Work", "Summit", "Conference", "Note", "Other"] as const;

function OthersTab() {
  const [items, setItems] = useState<OtherEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OtherEntry | null>(null);

  useEffect(() => { api.listOthers().then(setItems); }, []);

  function onSave(o: OtherEntry) {
    api.saveOther(o).then((saved) => {
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [saved, ...prev];
      });
      toast.success(editing ? "Entry updated" : "Entry added");
      setOpen(false); setEditing(null);
    });
  }

  function onDelete(id: string) {
    api.deleteOther(id).then(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success("Deleted");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Anything else worth context — experiences, personal works, summits, conferences, notes.</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add entry</Button></DialogTrigger>
          <OtherDialog entry={editing} onSave={onSave} />
        </Dialog>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={MoreHorizontal} title="No entries yet" description="Add anything that adds context — a talk, a side project, a summit, a note to self." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium">{o.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {o.category}
                      {o.date && ` · ${o.date}`}
                      {o.location && ` · ${o.location}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(o); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(o.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {o.details && <p className="mt-2 text-sm whitespace-pre-wrap">{o.details}</p>}
                {o.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {o.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                  </div>
                )}
                {o.link && (
                  <a href={o.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <LinkIcon className="h-3 w-3" />{o.link}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function OtherDialog({ entry, onSave }: { entry: OtherEntry | null; onSave: (o: OtherEntry) => void }) {
  const [f, setF] = useState<OtherEntry>(entry ?? {
    id: "", title: "", category: "Experience", date: "", location: "", details: "", link: "", tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  useEffect(() => { if (entry) setF(entry); }, [entry]);

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{entry ? "Edit entry" : "Add entry"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>Title</Label><Input placeholder="e.g. Spoke at PyCon 2024" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v as OtherEntry["category"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OTHER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="month" value={f.date ?? ""} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        </div>
        <div><Label>Location</Label><Input placeholder="Optional" value={f.location ?? ""} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
        <div><Label>Details</Label><Textarea rows={5} placeholder="Notes, context, what happened, what you took away…" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></div>
        <div><Label>Link</Label><Input placeholder="https://" value={f.link ?? ""} onChange={(e) => setF({ ...f, link: e.target.value })} /></div>
        <div>
          <Label>Tags</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {f.tags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1">{t}<button onClick={() => setF({ ...f, tags: f.tags.filter((x) => x !== t) })}><X className="h-3 w-3" /></button></Badge>
            ))}
          </div>
          <Input
            className="mt-2"
            placeholder="Type a tag and press Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                e.preventDefault();
                if (!f.tags.includes(tagInput.trim())) setF({ ...f, tags: [...f.tags, tagInput.trim()] });
                setTagInput("");
              }
            }}
          />
        </div>
      </div>
      <DialogFooter><Button onClick={() => onSave(f)}>Save</Button></DialogFooter>
    </DialogContent>
  );
}

