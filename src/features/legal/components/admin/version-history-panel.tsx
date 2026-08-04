"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { MoreHorizontal, Loader2, GitCompare } from "lucide-react";
import type { LegalPageType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { statusToneClass } from "@/lib/utils/status-colors";
import type { LegalSection } from "@/features/legal/types";
import { deleteLegalDraftAction } from "@/features/legal/services/legal-actions";
import { DraftEditorDialog, type DraftEditorSeed } from "@/features/legal/components/admin/draft-editor-dialog";
import { PublishDialog } from "@/features/legal/components/admin/publish-dialog";

export type VersionRow = {
  id: string;
  version: string;
  title: string;
  summary: string;
  sections: unknown;
  status: "DRAFT" | "PUBLISHED";
  versionKind: "MAJOR" | "MINOR" | null;
  changeSummary: string | null;
  effectiveDate: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  publishedBy: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string } | null;
};

function asSections(sections: unknown): LegalSection[] {
  return Array.isArray(sections) ? (sections as LegalSection[]) : [];
}

function statusBadge(v: VersionRow) {
  if (v.status === "DRAFT") {
    return (
      <Badge variant="outline" className={statusToneClass.info}>
        Draft
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={statusToneClass.success}>
      Published{v.versionKind ? ` · ${v.versionKind === "MAJOR" ? "Major" : "Minor"}` : ""}
    </Badge>
  );
}

function diffSections(a: LegalSection[], b: LegalSection[]) {
  const aMap = new Map(a.map((s) => [s.id, s]));
  const bMap = new Map(b.map((s) => [s.id, s]));
  const added = b.filter((s) => !aMap.has(s.id));
  const removed = a.filter((s) => !bMap.has(s.id));
  const modified = b.filter((s) => {
    const prev = aMap.get(s.id);
    if (!prev) return false;
    return prev.heading !== s.heading || prev.body.join("\n") !== s.body.join("\n");
  });
  return { added, removed, modified };
}

export function VersionHistoryPanel({
  documentType,
  versions,
  canManage,
  canPublish,
}: {
  documentType: LegalPageType;
  versions: VersionRow[];
  canManage: boolean;
  canPublish: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<VersionRow | null>(null);
  const [editSeed, setEditSeed] = useState<DraftEditorSeed | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<VersionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VersionRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const sorted = useMemo(
    () => [...versions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [versions]
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const compareA = sorted.find((v) => v.id === selected[0]) ?? null;
  const compareB = sorted.find((v) => v.id === selected[1]) ?? null;
  const diff = compareA && compareB ? diffSections(asSections(compareA.sections), asSections(compareB.sections)) : null;

  function openEdit(v: VersionRow) {
    setEditSeed({
      versionId: v.id,
      version: v.version,
      title: v.title,
      summary: v.summary,
      changeSummary: v.changeSummary ?? "",
      sections: asSections(v.sections),
    });
    setEditOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteLegalDraftAction(documentType, deleteTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft deleted");
      setDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select two versions to compare — added, removed, and modified sections are highlighted.
        </p>
        <Button size="sm" variant="outline" disabled={selected.length !== 2} onClick={() => setCompareOpen(true)}>
          <GitCompare className="size-3.5" />
          Compare selected
        </Button>
      </div>

      <div className="space-y-2">
        {sorted.map((v) => (
          <Card key={v.id} className="border shadow-sm">
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="flex items-start gap-3">
                <Checkbox checked={selected.includes(v.id)} onCheckedChange={() => toggleSelect(v.id)} className="mt-1" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">Version {v.version}</p>
                    {statusBadge(v)}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {v.status === "PUBLISHED"
                      ? `Effective ${v.effectiveDate ? format(v.effectiveDate, "MMM d, yyyy") : "—"} · Published by ${v.publishedBy?.fullName ?? "—"}`
                      : `Created by ${v.createdBy?.fullName ?? "—"} on ${format(v.createdAt, "MMM d, yyyy")}`}
                  </p>
                  {v.changeSummary && <p className="mt-1 text-xs text-muted-foreground">{v.changeSummary}</p>}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPreviewVersion(v)}>Preview</DropdownMenuItem>
                  {v.status === "DRAFT" && canManage && (
                    <DropdownMenuItem onClick={() => openEdit(v)}>Edit Draft</DropdownMenuItem>
                  )}
                  {v.status === "DRAFT" && canPublish && (
                    <DropdownMenuItem onClick={() => setPublishTarget(v)}>Publish New Version</DropdownMenuItem>
                  )}
                  {v.status === "DRAFT" && canPublish && (
                    <DropdownMenuItem onClick={() => setDeleteTarget(v)} className="text-destructive">
                      Delete Draft
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview */}
      <Dialog open={!!previewVersion} onOpenChange={(o) => !o && setPreviewVersion(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewVersion?.title}</DialogTitle>
            <DialogDescription>
              Version {previewVersion?.version} — {previewVersion?.summary}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {previewVersion &&
              asSections(previewVersion.sections).map((section) => (
                <section key={section.id} className="space-y-2">
                  <h3 className="text-sm font-semibold">{section.heading}</h3>
                  {section.body.map((p, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {p}
                    </p>
                  ))}
                </section>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Compare v{compareA?.version} → v{compareB?.version}
            </DialogTitle>
            <DialogDescription>Sections added, removed, or modified between the two versions.</DialogDescription>
          </DialogHeader>
          {diff && (
            <div className="space-y-5">
              {diff.added.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
                    Added
                  </p>
                  <ul className="space-y-1">
                    {diff.added.map((s) => (
                      <li key={s.id} className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
                        {s.heading}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {diff.removed.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-red-600 uppercase dark:text-red-400">
                    Removed
                  </p>
                  <ul className="space-y-1">
                    {diff.removed.map((s) => (
                      <li key={s.id} className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm">
                        {s.heading}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {diff.modified.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400">
                    Modified
                  </p>
                  <ul className="space-y-1">
                    {diff.modified.map((s) => (
                      <li key={s.id} className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm">
                        {s.heading}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0 && (
                <p className="text-sm text-muted-foreground">No section differences between these versions.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editSeed && (
        <DraftEditorDialog documentType={documentType} open={editOpen} onOpenChange={setEditOpen} seed={editSeed} />
      )}

      {publishTarget && (
        <PublishDialog
          documentType={documentType}
          versionId={publishTarget.id}
          version={publishTarget.version}
          open={!!publishTarget}
          onOpenChange={(o) => !o && setPublishTarget(null)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Version {deleteTarget?.version} will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Delete Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
