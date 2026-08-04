"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import type { LegalDocumentType } from "@prisma/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { reacceptLegalDocumentsAction } from "@/features/legal/services/legal-actions";

export type ReacceptGroup = {
  id: string;
  label: string;
  documentTypes: LegalDocumentType[];
  links: { href: string; label: string }[];
};

export function LegalReacceptForm({ groups }: { groups: ReacceptGroup[] }) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const allChecked = groups.every((g) => checked[g.id]);

  function handleSubmit() {
    const documentTypes = groups.flatMap((g) => g.documentTypes);
    startTransition(async () => {
      const result = await reacceptLegalDocumentsAction(documentTypes);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Thanks — you're all set.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="flex items-start gap-3 rounded-xl border p-4">
            <Checkbox
              id={group.id}
              checked={!!checked[group.id]}
              onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [group.id]: v === true }))}
              className="mt-0.5"
            />
            <Label htmlFor={group.id} className="flex-1 cursor-pointer text-sm font-normal">
              I have read and agree to the updated{" "}
              {group.links.map((link, i) => (
                <span key={link.href}>
                  {i > 0 && (group.links.length === 2 ? " and " : ", ")}
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:no-underline"
                  >
                    {link.label}
                    <ExternalLink className="size-3" />
                  </Link>
                </span>
              ))}
            </Label>
          </div>
        ))}
      </div>

      <Button className="w-full" disabled={!allChecked || isPending} onClick={handleSubmit}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Accept and Continue
      </Button>
    </div>
  );
}
