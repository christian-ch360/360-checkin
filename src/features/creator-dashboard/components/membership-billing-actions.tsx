"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { SubscriptionStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cancelMembership, resumeMembership } from "@/features/members/services/membership-actions";
import { MembershipPaymentActions } from "@/features/creator-dashboard/components/membership-payment-actions";

export function MembershipBillingActions({
  status,
  cancelAt,
  isStripeBacked,
}: {
  status: SubscriptionStatus;
  cancelAt: Date | null;
  isStripeBacked: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canResume = status === "CANCELED" && cancelAt != null && cancelAt > new Date();
  const canCancel = status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE";

  function onCancel() {
    startTransition(async () => {
      const result = await cancelMembership();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.pendingStripeSync
          ? "Cancellation requested — this updates as soon as Stripe confirms it."
          : "Membership canceled — you'll keep access until your current period ends."
      );
      setConfirmOpen(false);
      router.refresh();
    });
  }

  function onResume() {
    startTransition(async () => {
      const result = await resumeMembership();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.pendingStripeSync ? "Resume requested — this updates as soon as Stripe confirms it." : "Membership resumed");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <MembershipPaymentActions isStripeBacked={isStripeBacked} />
        {canResume && (
          <Button size="sm" onClick={onResume} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Resume membership
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} disabled={isPending}>
            Cancel membership
          </Button>
        )}
      </div>
      {cancelAt && status === "CANCELED" && cancelAt > new Date() && (
        <p className="text-xs text-muted-foreground">
          Your membership is canceled and will end on {format(cancelAt, "MMM d, yyyy")}.
        </p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your membership?</AlertDialogTitle>
            <AlertDialogDescription>
              You&rsquo;ll keep full access until the end of your current billing period. You can resume anytime before then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Keep membership
            </Button>
            <Button variant="destructive" onClick={onCancel} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Cancel membership
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
