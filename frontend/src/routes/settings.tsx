import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import type { ProfileInfo } from "@/lib/types";
import { Download, FileText, HeartHandshake, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings · CareerOS" },
      { name: "description", content: "Profile, templates, and data export." },
    ],
  }),
});

function SettingsPage() {
  const [p, setP] = useState<ProfileInfo | null>(null);
  useEffect(() => { api.getProfile().then(setP); }, []);

  function save() {
    if (!p) return;
    api.saveProfile(p).then(() => toast.success("Profile saved"));
  }

  if (!p) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Settings" description="Your profile and how CareerOS behaves." />

      <Card><CardContent className="p-6">
        <h3 className="mb-4 font-medium">Personal info</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" placeholder="e.g. Jane Doe" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
          <Field label="Email" placeholder="you@example.com" value={p.email} onChange={(v) => setP({ ...p, email: v })} />
          <Field label="Phone" placeholder="+233 55 123 4567" value={p.phone} onChange={(v) => setP({ ...p, phone: v })} />
          <Field label="Location" placeholder="e.g. Accra, Ghana" value={p.location} onChange={(v) => setP({ ...p, location: v })} />
          <div className="md:col-span-2">
            <Field label="LinkedIn" placeholder="https://linkedin.com/in/yourname" value={p.linkedin} onChange={(v) => setP({ ...p, linkedin: v })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save}>Save changes</Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">Templates</h3>
            <p className="text-sm text-muted-foreground">Base CV and cover letter templates.</p>
          </div>
          <Link to="/templates"><Button variant="outline"><FileText className="h-4 w-4" />Manage</Button></Link>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6 space-y-3">
        <h3 className="font-medium">Export</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success("Preparing ZIP...")}><Download className="h-4 w-4" />Download all data (ZIP)</Button>
          <Button variant="outline" onClick={() => toast.success("CSV exported")}><Download className="h-4 w-4" />Application history (CSV)</Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary"><Info className="h-4 w-4" /></div>
        <div>
          <h3 className="font-medium">About</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            CareerOS is a personal tool for tailoring CVs, cover letters, and cold emails to any job description — with a memory of every past application.
          </p>
          <a href="mailto:eyram@example.com" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <HeartHandshake className="h-3.5 w-3.5" />Feedback
          </a>
        </div>
      </CardContent></Card>
    </div>
  );
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
