"use client";

import { useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMembershipCheckoutSessionAction, createBillingPortalSessionAction } from "@/features/members/services/stripe-billing.actions";

/**
 * The one "Update payment method" / "Set up billing" button — a Stripe-backed
 * subscription opens the real Stripe Customer Portal; a member who's never
 * been through Checkout starts one instead. Both redirect to a Stripe-hosted
 * page (never a custom card form — see Phase 5/7 of the integration spec),
 * and both return here afterward via the current URL, so the button works
 * identically from /profile?tab=membership and /settings/membership.
 */
export function MembershipPaymentActions({ isStripeBacked }: { isStripeBacked: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    const qs = searchParams.toString();
    const returnPath = qs ? `${pathname}?${qs}` : pathname;

    startTransition(async () => {
      const result = isStripeBacked
        ? await createBillingPortalSessionAction(returnPath)
        : await createMembershipCheckoutSessionAction(undefined, returnPath);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.url;
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={isPending}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard />}
      {isStripeBacked ? "Update payment method" : "Set up billing"}
    </Button>
  );
}
