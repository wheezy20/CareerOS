import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/page-header";
import { api } from "@/lib/api";
import type { Application, CvLinks } from "@/lib/types";
import { Briefcase, ChevronDown, ChevronRight, Download, FileText, Loader2, Mail, Pencil, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/applications")({
  component: ApplicationsPage,
  head: () => ({
    meta: [
      { title: "Applications · CareerOS" },
      { name: "description", content: "Track every job you've applied to and where it stands." },
    ],
  }),
});

const STATUSES = ["Applied", "Interview", "Rejected", "Offer", "Ghosted"] as const;

const STATUS_STYLES: Record<Application["status"], string> = {
  Applied: "bg-primary/15 text-primary border-0",
  Interview: "bg-warning/20 text-warning-foreground border-0",
  Rejected: "bg-destructive/15 text-destructive border-0",
  Offer: "bg-success/15 text-success border-0",
  Ghosted: "bg-muted text-muted-foreground border-0",
};

function ApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { api.listApplications().then(setItems); }, []);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (q && !`${a.jobTitle} ${a.company}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, status, q]);

  function onSave(a: Application) {
    api.saveApplication(a).then((saved) => {
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [saved, ...prev];
      });
      toast.success(editing ? "Application updated" : "Application added");
      setOpen(false); setEditing(null);
    });
  }

  function exportCsv() {
    const rows = [
      ["Job Title", "Company", "Date Applied", "Status", "CV Version", "Match Score", "Notes"],
      ...items.map((a) => [a.jobTitle, a.company, a.dateApplied, a.status, a.cvVersion, String(a.matchScore ?? ""), a.notes.replace(/\n/g, " ")]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "applications.csv";
    link.click();
    toast.success("Exported CSV");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <PageHeader
          title="Applications"
          description="Everything you've sent, filtered and searchable."
          actions={
            <>
              <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4" />Add application</Button>
              </DialogTrigger>
            </>
          }
        />

        <Card className="mb-4"><CardContent className="flex flex-wrap gap-2 p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search job or company..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent></Card>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="Track every job you apply to, right from here."
            action={
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4" />Add first application</Button>
              </DialogTrigger>
            }
          />
        ) : (
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[80px] text-right">CV</TableHead>
                  <TableHead className="min-w-[72px] text-right">Match</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const expandable = !!a.parsedJobId;
                  const isExpanded = expandedId === a.id;
                  return (
                    <Fragment key={a.id}>
                      <TableRow
                        className={expandable ? "cursor-pointer" : undefined}
                        onClick={() => expandable && setExpandedId(isExpanded ? null : a.id)}
                      >
                        <TableCell>
                          {expandable && (isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ))}
                        </TableCell>
                        <TableCell className="font-medium">{a.jobTitle}</TableCell>
                        <TableCell>{a.company}</TableCell>
                        <TableCell className="text-muted-foreground">{a.dateApplied}</TableCell>
                        <TableCell><Badge className={STATUS_STYLES[a.status]}>{a.status}</Badge></TableCell>
                        <CvCell application={a} />
                        <TableCell className={`min-w-[72px] text-right ${a.matchScore ? "font-medium text-primary" : "text-muted-foreground"}`}>
                          {a.matchScore ? `${a.matchScore}%` : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="icon"
                            onClick={(e) => { e.stopPropagation(); setEditing(a); setOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && <ApplicationDetailRow application={a} />}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}

        <ApplicationDialog application={editing} onSave={onSave} />
      </Dialog>
    </div>
  );
}

function useCvLinks(applicationId: string, generatedCvId: string | null | undefined) {
  const [links, setLinks] = useState<CvLinks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!generatedCvId) return;
    setLoading(true);
    setError(false);
    api.getApplicationCvLinks(applicationId)
      .then(setLinks)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [applicationId, generatedCvId]);

  return { links, loading, error };
}

function CvCell({ application }: { application: Application }) {
  const { links, loading } = useCvLinks(application.id, application.generatedCvId);

  if (!application.generatedCvId) {
    return (
      <TableCell className="min-w-[80px] text-right text-muted-foreground">
        {application.cvVersion || "—"}
      </TableCell>
    );
  }

  const url = links?.pdfUrl || links?.docxUrl;

  return (
    <TableCell className="min-w-[80px] text-right">
      {loading ? (
        <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
      ) : url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </TableCell>
  );
}

function ApplicationDetailRow({ application }: { application: Application }) {
  const { links: cvLinks, loading: loadingCv, error: cvError } = useCvLinks(application.id, application.generatedCvId);

  const hasContent = application.generatedCvId || application.coverLetterText || application.coldEmailText;

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={8} className="p-4">
        {!hasContent ? (
          <p className="text-sm text-muted-foreground">No generated documents linked to this application.</p>
        ) : (
          <div className="space-y-3">
            {application.generatedCvId && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />CV
                </p>
                {loadingCv ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : cvError || !cvLinks || (!cvLinks.docxUrl && !cvLinks.pdfUrl) ? (
                  <p className="text-sm text-muted-foreground">CV files unavailable</p>
                ) : (
                  <div className="flex gap-2">
                    {cvLinks.docxUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={cvLinks.docxUrl} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5" />DOCX</a>
                      </Button>
                    )}
                    {cvLinks.pdfUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={cvLinks.pdfUrl} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5" />PDF</a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            {application.coverLetterText && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />Cover letter
                </p>
                <p className="whitespace-pre-wrap rounded-lg bg-background p-3 text-sm">{application.coverLetterText}</p>
              </div>
            )}
            {application.coldEmailText && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />Cold email
                </p>
                <p className="whitespace-pre-wrap rounded-lg bg-background p-3 text-sm">{application.coldEmailText}</p>
              </div>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function ApplicationDialog({ application, onSave }: { application: Application | null; onSave: (a: Application) => void }) {
  const empty: Application = {
    id: "", jobTitle: "", company: "", dateApplied: new Date().toISOString().slice(0, 10),
    status: "Applied", cvVersion: "", notes: "", matchScore: undefined,
  };
  const [f, setF] = useState<Application>(application ?? empty);
  useEffect(() => { if (application) setF(application); }, [application]);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{application ? "Edit application" : "Add application"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Job title</Label><Input value={f.jobTitle} onChange={(e) => setF({ ...f, jobTitle: e.target.value })} /></div>
          <div><Label>Company</Label><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></div>
          <div><Label>Date applied</Label><Input type="date" value={f.dateApplied} onChange={(e) => setF({ ...f, dateApplied: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as Application["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>CV version</Label><Input placeholder="e.g. v1" value={f.cvVersion} onChange={(e) => setF({ ...f, cvVersion: e.target.value })} /></div>
          <div>
            <Label>Match score (optional)</Label>
            <Input
              type="number" min={0} max={100} value={f.matchScore ?? ""}
              onChange={(e) => setF({ ...f, matchScore: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
        </div>
        <div><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => onSave(f)}
          disabled={!f.jobTitle || !f.company || !f.dateApplied}
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
