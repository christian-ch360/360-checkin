"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { LegalPageType, LegalVersionKind } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { publishLegalVersionAction } from "@/features/legal/services/legal-actions";

const CONFIRM_TEXT = "Publishing a major update will require all members to accept the updated document before continuing.";

export function PublishDialog({
  documentType,
  versionId,
  version,
  open,
  onOpenChange,
  onPublished,
}: {
  documentType: LegalPageType;
  versionId: string;
  version: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}) {
  const [kind, setKind] = useState<LegalVersionKind>("MINOR");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      setKind("MINOR");
      setEffectiveDate("");
      setChangeSummary("");
      setConfirmText("");
    }
    onOpenChange(next);
  }

  function handlePublish() {
    if (kind === "MAJOR" && confirmText.trim() !== CONFIRM_TEXT) {
      toast.error("Type the confirmation text exactly to publish a major update.");
      return;
    }

    startTransition(async () => {
      const result = await publishLegalVersionAction(documentType, versionId, {
        kind,
        effectiveDate: effectiveDate || undefined,
        changeSummary: changeSummary.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Version ${version} published`);
      onOpenChange(false);
      onPublished?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish version {version}</DialogTitle>
          <DialogDescription>Publishing is permanent — this version is never overwritten.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setKind("MINOR")}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                kind === "MINOR" ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              )}
            >
              <p className="text-sm font-medium">Minor Update</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Updates the version. Members are not required to re-accept.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setKind("MAJOR")}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                kind === "MAJOR" ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              )}
            >
              <p className="text-sm font-medium">Major Update</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Marks prior acceptances outdated. Members must re-accept before continuing.
              </p>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="publish-effective-date">Effective date</Label>
              <Input
                id="publish-effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="publish-change-summary">Change summary</Label>
              <Input
                id="publish-change-summary"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="What changed"
              />
            </div>
          </div>

          {kind === "MAJOR" && (
            <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{CONFIRM_TEXT}</p>
              <div className="space-y-1.5">
                <Label htmlFor="publish-confirm">Type the sentence above to confirm</Label>
                <Input
                  id="publish-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePublish}
            disabled={isPending || (kind === "MAJOR" && confirmText.trim() !== CONFIRM_TEXT)}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Publish {kind === "MAJOR" ? "major" : "minor"} update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
