import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Upload, CheckCircle2, FileText, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { Template } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({
  component: TemplatesPage,
  head: () => ({
    meta: [
      { title: "Templates · CareerOS" },
      { name: "description", content: "Upload your CV and cover letter base templates once — everything else builds on top." },
    ],
  }),
});

function TemplatesPage() {
  const [cv, setCv] = useState<Template | null>(null);
  const [cl, setCl] = useState<Template | null>(null);

  useEffect(() => {
    api.listTemplates()
      .then((templates) => {
        setCv(templates.find((t) => t.type === "cv") ?? null);
        setCl(templates.find((t) => t.type === "cover_letter") ?? null);
      })
      .catch(() => {
        setCv(null);
        setCl(null);
      });
  }, []);

  function upload(kind: "cv" | "cover_letter", file: File | null) {
    if (!file) return;
    api.uploadTemplate(kind, file).then((t) => {
      if (kind === "cv") setCv(t); else setCl(t);
      toast.success(`${kind === "cv" ? "CV" : "Cover letter"} template saved`);
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Templates"
        description="Upload your base CV and cover letter once. Each tailored version generates from these."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <TemplateSlot label="CV Template" accept=".docx,.pdf" template={cv} onFile={(f) => upload("cv", f)} />
        <TemplateSlot label="Cover Letter Template" accept=".docx,.pdf" template={cl} onFile={(f) => upload("cover_letter", f)} />
      </div>

      {(cv || cl) && (
        <div className="mt-6 flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" /> Templates saved. They'll be used for every generated document.
        </div>
      )}
    </div>
  );
}

function TemplateSlot({ label, accept, template, onFile }: {
  label: string; accept: string; template: Template | null; onFile: (f: File | null) => void;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-3 font-medium">{label}</h3>
        {template ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-accent/40 p-4">
              <FileText className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{template.fileName}</p>
                <p className="text-xs text-muted-foreground">Uploaded {template.uploadedAt}</p>
              </div>
            </div>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span><RefreshCw className="h-3.5 w-3.5" />Replace</span>
              </Button>
              <input type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 py-10 transition-colors hover:border-primary/40 hover:bg-accent/30">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm">Drag or click to upload</span>
            <span className="text-xs text-muted-foreground">{accept}</span>
            <input type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </CardContent>
    </Card>
  );
}
