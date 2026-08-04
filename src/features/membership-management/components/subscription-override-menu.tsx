"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MoreVertical } from "lucide-react";
import type { SubscriptionStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminUpdateSubscription, type SubscriptionOverrideAction } from "@/features/membership-management/services/actions";

type DialogKind = SubscriptionOverrideAction | null;

const CONFIRM_COPY: Record<Exclude<DialogKind, "EXTEND_TRIAL" | null>, { title: string; description: string }> = {
  GRANT_COMPLIMENTARY: {
    title: "Grant a complimentary membership?",
    description: "Sets this member's billing to Active with no charge, renewing in 12 months.",
  },
  PAUSE: {
    title: "Pause this membership?",
    description: "Access ends immediately. The member can be reactivated at any time.",
  },
  MANUALLY_ACTIVATE: {
    title: "Manually activate this membership?",
    description: "Sets billing to Active for the next month, bypassing trial and payment status.",
  },
};

export function SubscriptionOverrideMenu({
  memberId,
  status,
}: {
  memberId: string;
  status: SubscriptionStatus;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [extendMonths, setExtendMonths] = useState("1");
  const [isPending, startTransition] = useTransition();

  function run(action: SubscriptionOverrideAction, options?: { extendTrialMonths?: number }) {
    startTransition(async () => {
      const result = await adminUpdateSubscription(memberId, action, options);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Membership updated");
      setDialog(null);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("GRANT_COMPLIMENTARY")}>
            Grant complimentary
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("EXTEND_TRIAL")}>Extend trial</DropdownMenuItem>
          <DropdownMenuItem disabled={status === "CANCELED" || status === "EXPIRED"} onSelect={() => setDialog("PAUSE")}>
            Pause membership
          </DropdownMenuItem>
          <DropdownMenuItem disabled={status === "ACTIVE"} onSelect={() => setDialog("MANUALLY_ACTIVATE")}>
            Manually activate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={dialog !== null && dialog !== "EXTEND_TRIAL"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          {dialog && dialog !== "EXTEND_TRIAL" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{CONFIRM_COPY[dialog].title}</AlertDialogTitle>
                <AlertDialogDescription>{CONFIRM_COPY[dialog].description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={() => run(dialog)} disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Confirm
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialog === "EXTEND_TRIAL"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend trial</DialogTitle>
            <DialogDescription>
              Adds months to the trial from today (or from the current trial end date, if it&rsquo;s still ahead).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="extend-months">Months to add</Label>
            <Input
              id="extend-months"
              type="number"
              min={1}
              max={24}
              value={extendMonths}
              onChange={(e) => setExtendMonths(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => run("EXTEND_TRIAL", { extendTrialMonths: Math.max(1, Number(extendMonths) || 1) })}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
