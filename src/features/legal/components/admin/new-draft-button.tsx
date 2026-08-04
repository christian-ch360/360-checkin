"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { LegalPageType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { DraftEditorDialog, type DraftEditorSeed } from "@/features/legal/components/admin/draft-editor-dialog";

export function NewDraftButton({ documentType, seed }: { documentType: LegalPageType; seed: DraftEditorSeed }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        New Draft
      </Button>
      <DraftEditorDialog documentType={documentType} open={open} onOpenChange={setOpen} seed={seed} />
    </>
  );
}
