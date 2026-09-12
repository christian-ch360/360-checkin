import Link from "next/link";
import { format } from "date-fns";
import { CreditCard, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";
import { SUBSCRIPTION_STATUS_META } from "@/features/membership-plans/config/subscription-status-meta";
import { TrialProgress } from "@/features/creator-dashboard/components/trial-progress";
import type { MemberMembershipSummary } from "@/features/creator-dashboard/services/membership.service";

/**
 * Home's lightweight membership summary — status + one relevant date, not
 * the full billing/benefits page (that's MembershipOverview, reached via
 * the link below). Only ever rendered for a role that requiresMembership
 * (see billing-config.ts) — every other role has no MemberSubscription row
 * at all, so this component isn't mounted for them rather than showing an
 * empty/error state that doesn't apply to their account.
 */
export function HomeMembershipStatus({ membership, memberSince }: { membership: MemberMembershipSummary; memberSince: Date }) {
  if (!membership) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CreditCard className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Membership not set up yet</p>
            <p className="text-xs text-muted-foreground">Contact an admin to get set up.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const meta = SUBSCRIPTION_STATUS_META[membership.status];
  const isPastDue = membership.status === "PAST_DUE";
  const isTrialing = membership.status === "TRIALING" && membership.trialEndsAt;

  const dateLine = isTrialing
    ? null // TrialProgress below shows the countdown instead of a plain date
    : membership.status === "CANCELED" || membership.status === "EXPIRED"
      ? null
      : membership.renewalDate
        ? `Renews ${format(membership.renewalDate, "MMM d, yyyy")}`
        : null;

  return (
    <Card className={cn("rounded-2xl", isPastDue && "border-warning/30 bg-warning/5")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              isPastDue ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
            )}
          >
            {isPastDue ? <AlertTriangle className="size-4.5" /> : <CreditCard className="size-4.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{membership.planName}</p>
              <Badge variant="outline" className={cn("text-xs", statusToneClass[meta.tone])}>
                {meta.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPastDue ? "Your payment method needs attention." : dateLine}
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/profile?tab=membership">{isPastDue ? "Fix payment" : "View"}</Link>
          </Button>
        </div>
        {isTrialing && membership.trialEndsAt && <TrialProgress trialStartedAt={memberSince} trialEndsAt={membership.trialEndsAt} />}
      </CardContent>
    </Card>
  );
}
