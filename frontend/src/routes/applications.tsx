import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import type { Application } from "@/lib/types";
import { Briefcase, Download, Plus, Search } from "lucide-react";
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
      toast.success("Application added");
      setOpen(false);
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
      <Dialog open={open} onOpenChange={setOpen}>
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
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CV</TableHead>
                  <TableHead className="text-right">Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.jobTitle}</TableCell>
                    <TableCell>{a.company}</TableCell>
                    <TableCell className="text-muted-foreground">{a.dateApplied}</TableCell>
                    <TableCell><Badge className={STATUS_STYLES[a.status]}>{a.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{a.cvVersion}</TableCell>
                    <TableCell className="text-right font-medium text-primary">{a.matchScore ? `${a.matchScore}%` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}

        <ApplicationDialog onSave={onSave} />
      </Dialog>
    </div>
  );
}

function ApplicationDialog({ onSave }: { onSave: (a: Application) => void }) {
  const empty: Application = {
    id: "", jobTitle: "", company: "", dateApplied: new Date().toISOString().slice(0, 10),
    status: "Applied", cvVersion: "", notes: "", matchScore: undefined,
  };
  const [f, setF] = useState<Application>(empty);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Add application</DialogTitle></DialogHeader>
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
