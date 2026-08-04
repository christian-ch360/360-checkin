"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { transferOwnershipAction } from "@/features/agencies/services/agency-actions";
import type { AgencyTeamMember } from "@/features/agencies/services/agency-access.service";

/**
 * "Transfer ownership of this agency?" confirmation. New Owner ↓ old Owner
 * automatically becomes Manager (see transferOwnership in agency-team.service.ts) —
 * this dialog only confirms intent, the demotion happens server-side.
 */
export function TransferOwnershipDialog({
  target,
  onOpenChange,
}: {
  target: AgencyTeamMember | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await transferOwnershipAction(target.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${target.fullName} is now the Owner. You've been moved to Manager.`);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Transfer ownership of this agency?</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.fullName} will become the new Owner with full administrative control. You&apos;ll automatically
            become a Manager. This can be reversed later by having the new Owner transfer it back.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Transfer ownership
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
