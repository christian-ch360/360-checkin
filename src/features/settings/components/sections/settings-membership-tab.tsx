import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";
import { SUBSCRIPTION_STATUS_META } from "@/features/membership-plans/config/subscription-status-meta";
import {
  MembershipOverview,
  type MembershipOverviewData,
  type MembershipOverviewSwitchablePlan,
} from "@/features/creator-dashboard/components/membership-overview";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";

/** A compact, wallet-style visual summary — the "Membership Card" — above the full interactive membership overview. */
function MembershipCard({
  planName,
  priceCents,
  status,
  memberFullName,
  memberNumber,
}: {
  planName: string;
  priceCents: number;
  status: keyof typeof SUBSCRIPTION_STATUS_META;
  memberFullName: string;
  memberNumber: string;
}) {
  const statusMeta = SUBSCRIPTION_STATUS_META[status];

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary via-primary to-primary/70 p-6 text-primary-foreground shadow-lg">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">CreatorHub360 Membership</p>
      <p className="mt-2 text-2xl font-semibold">{planName}</p>
      <p className="mt-1 text-sm opacity-90">
        {memberFullName} · {memberNumber}
      </p>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-medium opacity-90">{formatCurrency(priceCents / 100)}/mo</span>
        <Badge variant="outline" className="border-white/40 bg-white/10 text-white">
          {statusMeta.label}
        </Badge>
      </div>
    </div>
  );
}

export function SettingsMembershipTab({
  membership,
  switchablePlans,
  memberFullName,
  memberNumber,
  checkoutStatus,
}: {
  membership: MembershipOverviewData;
  switchablePlans: MembershipOverviewSwitchablePlan[];
  memberFullName: string;
  memberNumber: string;
  checkoutStatus?: "success" | "cancelled";
}) {
  return (
    <SettingsSectionCard title="Membership" description="Your package, benefits, and billing.">
      <div className="space-y-6">
        {membership && (
          <MembershipCard
            planName={membership.plan.name}
            priceCents={membership.plan.priceCents}
            status={membership.status}
            memberFullName={memberFullName}
            memberNumber={memberNumber}
          />
        )}
        <MembershipOverview membership={membership} switchablePlans={switchablePlans} checkoutStatus={checkoutStatus} />
      </div>
    </SettingsSectionCard>
  );
}
