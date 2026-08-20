import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RecordPaymentDialog } from "@/features/members/components/record-payment-dialog";
import { statusToneClass } from "@/lib/utils/status-colors";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { CreditCard } from "lucide-react";
import type { SubscriptionStatus, MembershipPaymentStatus } from "@prisma/client";
import { SUBSCRIPTION_STATUS_META } from "@/features/membership-plans/config/subscription-status-meta";
import { MEMBERSHIP_PAYMENT_STATUS_META } from "@/features/membership-plans/config/membership-payment-status-meta";

type MemberMembershipTabProps = {
  subscription: {
    id: string;
    status: SubscriptionStatus;
    startedAt: Date;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    cancelAt: Date | null;
    /** Stripe Customer/Subscription id — not sensitive (Stripe treats these as safe to display, unlike card/payment credentials), shown so an admin can jump to the matching record in the Stripe Dashboard. Null means this member has never been through Checkout — a trial/legacy/admin-managed subscription. */
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    plan: { name: string; priceCents: number };
    payments: { id: string; amountCents: number; status: MembershipPaymentStatus; paidAt: Date; note: string | null }[];
  } | null;
  canManage: boolean;
};

export function MemberMembershipTab({ subscription, canManage }: MemberMembershipTabProps) {
  if (!subscription) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState icon={CreditCard} title="No membership plan" description="This member isn't subscribed to a membership plan yet." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">{subscription.plan.name}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(subscription.plan.priceCents / 100)} / month
            </p>
          </div>
          <Badge variant="outline" className={statusToneClass[SUBSCRIPTION_STATUS_META[subscription.status].tone]}>
            {SUBSCRIPTION_STATUS_META[subscription.status].label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="font-medium">{format(subscription.startedAt, "MMM d, yyyy")}</p>
            </div>
            {subscription.trialEndsAt && (
              <div>
                <p className="text-xs text-muted-foreground">Trial ends</p>
                <p className="font-medium">{format(subscription.trialEndsAt, "MMM d, yyyy")}</p>
              </div>
            )}
            {subscription.currentPeriodEnd && (
              <div>
                <p className="text-xs text-muted-foreground">Next renewal</p>
                <p className="font-medium">{format(subscription.currentPeriodEnd, "MMM d, yyyy")}</p>
              </div>
            )}
            {subscription.cancelAt && (
              <div>
                <p className="text-xs text-muted-foreground">Access ends</p>
                <p className="font-medium">{format(subscription.cancelAt, "MMM d, yyyy")}</p>
              </div>
            )}
          </div>
          {canManage && (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <p className="text-xs text-muted-foreground">Stripe billing</p>
              {subscription.stripeSubscriptionId ? (
                <div className="mt-1 space-y-0.5 font-mono text-xs">
                  <p>Customer: {subscription.stripeCustomerId}</p>
                  <p>Subscription: {subscription.stripeSubscriptionId}</p>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Not connected to Stripe — this member hasn&rsquo;t gone through Checkout yet.
                </p>
              )}
            </div>
          )}
          {canManage && (
            <RecordPaymentDialog subscriptionId={subscription.id} planName={subscription.plan.name} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {subscription.payments.map((payment) => {
                const meta = MEMBERSHIP_PAYMENT_STATUS_META[payment.status];
                return (
                  <div key={payment.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{format(payment.paidAt, "MMM d, yyyy")}</p>
                      {payment.note && <p className="truncate text-xs text-muted-foreground">{payment.note}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-medium">{formatCurrency(payment.amountCents / 100)}</span>
                      <Badge variant="outline" className={cn("text-xs", statusToneClass[meta.tone])}>
                        {meta.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
