"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { LegalPageType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  createLegalDraftAction,
  updateLegalDraftAction,
  type DraftFormInput,
} from "@/features/legal/services/legal-actions";
import type { LegalSection } from "@/features/legal/types";

export type DraftEditorSeed = {
  versionId?: string;
  version: string;
  title: string;
  summary: string;
  changeSummary: string;
  sections: LegalSection[];
};

function toFormSections(sections: LegalSection[]): { heading: string; body: string }[] {
  if (sections.length === 0) return [{ heading: "", body: "" }];
  return sections.map((s) => ({ heading: s.heading, body: s.body.join("\n\n") }));
}

export function DraftEditorDialog({
  documentType,
  open,
  onOpenChange,
  seed,
  onSaved,
}: {
  documentType: LegalPageType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed: DraftEditorSeed;
  onSaved?: () => void;
}) {
  const [version, setVersion] = useState(seed.version);
  const [title, setTitle] = useState(seed.title);
  const [summary, setSummary] = useState(seed.summary);
  const [changeSummary, setChangeSummary] = useState(seed.changeSummary);
  const [sections, setSections] = useState(toFormSections(seed.sections));
  const [isPending, startTransition] = useTransition();

  function resetTo(nextSeed: DraftEditorSeed) {
    setVersion(nextSeed.version);
    setTitle(nextSeed.title);
    setSummary(nextSeed.summary);
    setChangeSummary(nextSeed.changeSummary);
    setSections(toFormSections(nextSeed.sections));
  }

  function handleOpenChange(next: boolean) {
    if (next) resetTo(seed);
    onOpenChange(next);
  }

  function updateSection(index: number, field: "heading" | "body", value: string) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addSection() {
    setSections((prev) => [...prev, { heading: "", body: "" }]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!version.trim() || !title.trim() || !summary.trim()) {
      toast.error("Version, title, and summary are required.");
      return;
    }
    const cleanSections = sections.filter((s) => s.heading.trim() && s.body.trim());
    if (cleanSections.length === 0) {
      toast.error("At least one section is required.");
      return;
    }

    const input: DraftFormInput = {
      version: version.trim(),
      title: title.trim(),
      summary: summary.trim(),
      changeSummary: changeSummary.trim() || undefined,
      sections: cleanSections,
    };

    startTransition(async () => {
      const result = seed.versionId
        ? await updateLegalDraftAction(documentType, seed.versionId, input)
        : await createLegalDraftAction(documentType, input);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(seed.versionId ? "Draft updated" : "Draft created");
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{seed.versionId ? "Edit draft" : "New draft"}</DialogTitle>
          <DialogDescription>
            Drafts never overwrite a previous version — publishing this draft creates a new permanent version row.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="draft-version">Version</Label>
              <Input id="draft-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2.0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="draft-change-summary">Change summary (optional)</Label>
              <Input
                id="draft-change-summary"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Minor wording changes"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="draft-title">Title</Label>
            <Input id="draft-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="draft-summary">Summary</Label>
            <Textarea id="draft-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Sections</Label>
              <Button type="button" size="sm" variant="outline" onClick={addSection}>
                <Plus className="size-3.5" />
                Add section
              </Button>
            </div>
            {sections.map((section, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={section.heading}
                    onChange={(e) => updateSection(i, "heading", e.target.value)}
                    placeholder="Section heading"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeSection(i)}
                    disabled={sections.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Textarea
                  value={section.body}
                  onChange={(e) => updateSection(i, "body", e.target.value)}
                  placeholder="Section body — separate paragraphs with a blank line"
                  rows={4}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {seed.versionId ? "Save draft" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
