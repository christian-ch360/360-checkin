import { format } from "date-fns";
import type { SubscriptionStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { LaunchPromoBanner } from "@/components/shared/launch-promo-banner";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";
import { formatCurrency } from "@/lib/utils/format";
import { CreditCard } from "lucide-react";
import { SUBSCRIPTION_STATUS_META } from "@/features/membership-plans/config/subscription-status-meta";
import { TrialProgress } from "@/features/creator-dashboard/components/trial-progress";
import { MembershipBillingActions } from "@/features/creator-dashboard/components/membership-billing-actions";
import { MembershipPlanSwitcher } from "@/features/creator-dashboard/components/membership-plan-switcher";
import { UseGuestPassButton } from "@/features/creator-dashboard/components/use-guest-pass-button";
import type { MemberBenefitStatus } from "@/features/creator-dashboard/services/membership.service";
import type { PlanBenefitLine } from "@/features/membership-plans/services/membership-features.service";

export type MembershipOverviewData = {
  status: SubscriptionStatus;
  memberSince: Date;
  trialEndsAt: Date | null;
  renewalDate: Date | null;
  cancelAt: Date | null;
  plan: { id: string; name: string; priceCents: number; trialMonths: number };
  benefitsRemaining: MemberBenefitStatus[];
  additionalBenefits: string[];
  payments: { id: string; amountCents: number; paidAt: Date; note: string | null }[];
} | null;

export type MembershipOverviewSwitchablePlan = { id: string; name: string; priceCents: number; entitlements: PlanBenefitLine[] };

/**
 * The full interactive membership experience — Current Package, Monthly
 * Price, Renewal Date, Status, upgrade/downgrade/cancel, Benefits
 * Remaining, billing history, additional benefits. Shared by the Creator
 * Dashboard's Membership tab (which wraps this with revenue widgets) and
 * the Settings Membership tab (which wraps this with a visual membership
 * card) — one implementation, two presentations, no drift between them.
 */
export function MembershipOverview({
  membership,
  switchablePlans,
}: {
  membership: MembershipOverviewData;
  switchablePlans: MembershipOverviewSwitchablePlan[];
}) {
  if (!membership) {
    return (
      <Card>
        <CardContent className="p-5">
          <EmptyState icon={CreditCard} title="No membership plan yet" description="Contact an admin to get set up." />
        </CardContent>
      </Card>
    );
  }

  const status = SUBSCRIPTION_STATUS_META[membership.status];

  return (
    <div className="space-y-4">
      {membership.plan.trialMonths > 0 && membership.status === "TRIALING" && (
        <LaunchPromoBanner
          planName={membership.plan.name}
          priceCents={membership.plan.priceCents}
          trialMonths={membership.plan.trialMonths}
        />
      )}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Current Package</p>
            <p className="mt-1 text-sm font-medium">{membership.plan.name}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Monthly Price</p>
            <p className="mt-1 text-sm font-medium">{formatCurrency(membership.plan.priceCents / 100)}/mo</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Access status</p>
            <p className="mt-1">
              <Badge variant="outline" className={cn(statusToneClass[status.tone])}>
                {status.label}
              </Badge>
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">{membership.status === "TRIALING" ? "Trial ends" : "Renewal Date"}</p>
            <p className="mt-1 text-sm font-medium">
              {membership.status === "TRIALING" && membership.trialEndsAt
                ? format(membership.trialEndsAt, "MMM d, yyyy")
                : membership.renewalDate
                  ? format(membership.renewalDate, "MMM d, yyyy")
                  : "—"}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Member since</p>
            <p className="mt-1 text-sm font-medium">{format(membership.memberSince, "MMM d, yyyy")}</p>
          </div>
        </CardContent>
        {membership.status === "TRIALING" && membership.trialEndsAt && (
          <CardContent className="px-5 pb-5 pt-0">
            <TrialProgress trialStartedAt={membership.memberSince} trialEndsAt={membership.trialEndsAt} />
          </CardContent>
        )}
        <CardContent className="space-y-3 border-t px-5 pb-5 pt-4">
          <MembershipPlanSwitcher
            currentPlanId={membership.plan.id}
            currentPlanName={membership.plan.name}
            currentPriceCents={membership.plan.priceCents}
            currentEntitlements={switchablePlans.find((p) => p.id === membership.plan.id)?.entitlements ?? []}
            plans={switchablePlans}
            disabled={membership.status === "EXPIRED"}
          />
          <MembershipBillingActions status={membership.status} cancelAt={membership.cancelAt} />
        </CardContent>
      </Card>

      {membership.benefitsRemaining.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium">Benefits Remaining</p>
            <p className="text-xs text-muted-foreground">What&rsquo;s left on your {membership.plan.name}, right now.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {membership.benefitsRemaining.map((b) => (
                <div key={b.key} className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                  <p className={cn("mt-1 text-lg font-semibold", b.isCountdown && b.remaining === 0 && "text-destructive")}>
                    {b.statusLabel}
                  </p>
                  {b.key === "guest_passes_per_day" && (
                    <div className="mt-3">
                      <UseGuestPassButton disabled={b.isCountdown && b.remaining === 0} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {membership.payments.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium">Billing history</p>
            <div className="mt-3 space-y-3">
              {membership.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{format(payment.paidAt, "MMM d, yyyy")}</p>
                    {payment.note && <p className="text-xs text-muted-foreground">{payment.note}</p>}
                  </div>
                  <span className="font-medium">{formatCurrency(payment.amountCents / 100)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {membership.additionalBenefits.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium">Additional Benefits</p>
            <ul className="mt-3 space-y-2">
              {membership.additionalBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40" />
                  {b}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
