import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import type { ParsedJob, MatchAnalysis } from "@/lib/types";
import {
  Upload, LinkIcon, ClipboardPaste, Loader2, Sparkles, FileText, Mail,
  Download, Copy, RefreshCw, CheckCircle2, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";

export const Route = createFileRoute("/pipeline")({
  component: PipelinePage,
  head: () => ({
    meta: [
      { title: "Job Pipeline · CareerOS" },
      { name: "description", content: "Drop a job description in. Get a tailored CV, cover letter, and cold email out." },
    ],
  }),
});

type Step = 1 | 2 | 3;

function PipelinePage() {
  const [step, setStep] = useState<Step>(1);
  const [parsed, setParsed] = useState<ParsedJob | null>(null);
  const [match, setMatch] = useState<MatchAnalysis | null>(null);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Job Pipeline" description="Three steps: input the job, review the match, generate everything." />

      <Stepper step={step} />

      <div className="mt-6">
        {step === 1 && (
          <StepInput onParsed={(p) => {
            setParsed(p);
            api.analyzeMatch(p.id).then(setMatch);
            setStep(2);
          }} />
        )}
        {step === 2 && parsed && (
          <StepReview parsed={parsed} match={match} onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && parsed && (
          <StepGenerate parsed={parsed} onBack={() => setStep(2)} />
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = ["Job input", "Review & match", "Generate"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n; const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              done ? "bg-primary text-primary-foreground" : active ? "bg-accent text-primary border border-primary" : "bg-muted text-muted-foreground"
            }`}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
            </div>
            <span className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
            {i < steps.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function StepInput({ onParsed }: { onParsed: (p: ParsedJob) => void }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(""); const [text, setText] = useState("");

  function handle(promise: Promise<ParsedJob>) {
    setLoading(true);
    promise.then((p) => { toast.success("Job parsed"); onParsed(p); }).finally(() => setLoading(false));
  }

  return (
    <Card><CardContent className="p-6">
      <Tabs defaultValue="paste">
        <TabsList>
          <TabsTrigger value="upload"><Upload className="mr-1.5 h-3.5 w-3.5" />Upload PDF</TabsTrigger>
          <TabsTrigger value="link"><LinkIcon className="mr-1.5 h-3.5 w-3.5" />Paste link</TabsTrigger>
          <TabsTrigger value="paste"><ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />Paste text</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="pt-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 py-10 transition-colors hover:border-primary/40 hover:bg-accent/30">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm">Drop the job description PDF</span>
            <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(api.parseJobFromPDF(f)); }} />
          </label>
        </TabsContent>
        <TabsContent value="link" className="pt-4 space-y-3">
          <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button onClick={() => url && handle(api.parseJobFromURL(url))} disabled={!url || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Fetch & parse
          </Button>
        </TabsContent>
        <TabsContent value="paste" className="pt-4 space-y-3">
          <Textarea rows={10} placeholder="Paste the full job description..." value={text} onChange={(e) => setText(e.target.value)} />
          <Button onClick={() => text && handle(api.parseJobFromText(text))} disabled={!text || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Parse
          </Button>
        </TabsContent>
      </Tabs>
    </CardContent></Card>
  );
}

function StepReview({ parsed, match, onNext, onBack }: {
  parsed: ParsedJob; match: MatchAnalysis | null; onNext: () => void; onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{parsed.title}</h2>
            <p className="text-sm text-muted-foreground">{parsed.company} · {parsed.location} · {parsed.yearsRequired}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Required skills</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parsed.requiredSkills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Responsibilities</p>
          <ul className="mt-2 space-y-1 text-sm">{parsed.responsibilities.map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Keywords</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parsed.keywords.map((k) => <Badge key={k} variant="outline">{k}</Badge>)}
          </div>
        </div>
        <Collapsible className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1"><ChevronDown className="h-3.5 w-3.5" />Full description</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{parsed.fullDescription}</CollapsibleContent>
        </Collapsible>
      </CardContent></Card>

      {match && (
        <Card><CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center rounded-2xl gradient-primary px-5 py-3 text-primary-foreground shadow-sm">
              <span className="text-3xl font-semibold leading-none">{match.score}%</span>
              <span className="text-xs opacity-90">Match</span>
            </div>
            <div className="flex-1">
              <Progress value={match.score} />
              <p className="mt-2 text-sm text-muted-foreground">Based on skills, roles, and projects you've logged.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-success">Your relevant skills</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {match.matchedSkills.map((s) => <Badge key={s} className="bg-success/15 text-success hover:bg-success/20 border-0">{s}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-warning">Skill gaps</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {match.skillGaps.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            </div>
          </div>
        </CardContent></Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Continue to generate<Sparkles className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function StepGenerate({ parsed, onBack }: { parsed: ParsedJob; onBack: () => void }) {
  const [cv, setCv] = useState<{ url: string; version: string } | null>(null);
  const [cl, setCl] = useState<{ url: string } | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function gen(kind: string, run: () => Promise<void>) {
    setBusy(kind); run().finally(() => setBusy(null));
  }

  function downloadFile(url: string | undefined, label: string) {
    if (!url) {
      toast.error(`No ${label} available yet`);
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error(`Couldn't download ${label}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <GenCard icon={FileText} title="CV" desc="Tailored resume as DOCX/PDF"
          onGenerate={() => gen("cv", () => api.generateCV(parsed.id).then((r) => { setCv(r); toast.success("CV ready"); }))}
          busy={busy === "cv"} generated={!!cv}
          info={cv ? `Version ${cv.version}` : undefined}
        />
        <GenCard icon={Mail} title="Cover letter" desc="Company-specific narrative"
          onGenerate={() => gen("cl", () => api.generateCoverLetter(parsed.id).then((r) => { setCl(r); toast.success("Cover letter ready"); }))}
          busy={busy === "cl"} generated={!!cl}
        />
        <GenCard icon={Sparkles} title="Cold email" desc="Short outreach draft"
          onGenerate={() => gen("email", () => api.generateColdEmail(parsed.id).then((r) => { setEmail(r.text); toast.success("Email ready"); }))}
          busy={busy === "email"} generated={!!email}
        />
      </div>

      {cv && (
        <Card><CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">CV preview</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => gen("cv", () => api.generateCV(parsed.id).then((r) => { setCv(r); toast.success("CV ready"); }))}><RefreshCw className="h-3.5 w-3.5" />Regenerate</Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile(cv?.url, "CV (DOCX)")}><Download className="h-3.5 w-3.5" />DOCX</Button>
              <Button size="sm" onClick={() => downloadFile(cv?.url?.replace(".docx", ".pdf"), "CV (PDF)")}><Download className="h-3.5 w-3.5" />PDF</Button>
            </div>
          </div>
          <div className="flex h-64 items-center justify-center rounded-lg bg-muted/60 text-sm text-muted-foreground">
            [ DOCX preview — {cv.version} ]
          </div>
        </CardContent></Card>
      )}

      {cl && (
        <Card><CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">Cover letter preview</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => gen("cl", () => api.generateCoverLetter(parsed.id).then((r) => { setCl(r); toast.success("Cover letter ready"); }))}><RefreshCw className="h-3.5 w-3.5" />Regenerate</Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile(cl?.url, "cover letter (DOCX)")}><Download className="h-3.5 w-3.5" />DOCX</Button>
              <Button size="sm" onClick={() => downloadFile(cl?.url?.replace(".docx", ".pdf"), "cover letter (PDF)")}><Download className="h-3.5 w-3.5" />PDF</Button>
            </div>
          </div>
          <div className="flex h-40 items-center justify-center rounded-lg bg-muted/60 text-sm text-muted-foreground">
            [ Cover letter preview ]
          </div>
        </CardContent></Card>
      )}

      {email && (
        <Card><CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">Cold email</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(email); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" />Copy</Button>
              <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5" />Regenerate</Button>
            </div>
          </div>
          <Textarea rows={10} value={email} onChange={(e) => setEmail(e.target.value)} className="font-mono text-sm" />
        </CardContent></Card>
      )}

      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack}>Back to review</Button>
      </div>
    </div>
  );
}

function GenCard({ icon: Icon, title, desc, onGenerate, busy, generated, info }: {
  icon: React.ComponentType<{ className?: string }>; title: string; desc: string;
  onGenerate: () => void; busy: boolean; generated: boolean; info?: string;
}) {
  return (
    <Card><CardContent className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary"><Icon className="h-4 w-4" /></div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {info && <p className="text-xs text-primary">{info}</p>}
      <Button size="sm" onClick={onGenerate} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : generated ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {generated ? "Regenerate" : "Generate"}
      </Button>
    </CardContent></Card>
  );
}
