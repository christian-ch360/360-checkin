import { redirect } from "next/navigation";
import type { SubscriptionStatus } from "@prisma/client";
import { Hourglass, CheckCircle2, AlertTriangle, XCircle, Ban } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import {
  listMemberSubscriptions,
  getMembershipStatusCounts,
} from "@/features/membership-management/services/membership-management.service";
import { SUBSCRIPTION_STATUS_META } from "@/features/membership-plans/config/subscription-status-meta";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { MembershipManagementFilters } from "@/features/membership-management/components/membership-management-filters";
import {
  MembershipManagementTable,
  type MembershipManagementRow,
} from "@/features/membership-management/components/membership-management-table";

const STATUS_ICON: Record<SubscriptionStatus, typeof Hourglass> = {
  TRIALING: Hourglass,
  ACTIVE: CheckCircle2,
  PAST_DUE: AlertTriangle,
  CANCELED: Ban,
  EXPIRED: XCircle,
};

export const dynamic = "force-dynamic";

export const metadata = { title: "Membership Management" };

export default async function MembershipManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "billing.manage")) redirect("/dashboard");
  const canOverride = hasPermission(actor.systemRole, "billing.override");

  const params = await searchParams;
  const status = params.status && params.status !== "all" ? (params.status as SubscriptionStatus) : undefined;

  const [subscriptions, statusCounts] = await Promise.all([
    listMemberSubscriptions(actor.organizationId, { status, search: params.search }),
    getMembershipStatusCounts(actor.organizationId),
  ]);

  const rows: MembershipManagementRow[] = subscriptions.map((s) => ({
    memberId: s.member.id,
    fullName: s.member.fullName,
    email: s.member.email,
    memberNumber: s.member.memberNumber,
    role: s.member.role,
    profilePhotoUrl: s.member.profilePhotoUrl,
    status: s.status,
    trialEndsAt: s.trialEndsAt,
    currentPeriodEnd: s.currentPeriodEnd,
    planName: s.plan.name,
    planPriceCents: s.plan.priceCents,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Membership Management"
        description={
          canOverride
            ? "Search, filter, and manage every Creator membership — including billing overrides."
            : "Search and filter every Creator membership."
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(SUBSCRIPTION_STATUS_META) as SubscriptionStatus[]).map((s) => (
          <StatCard key={s} label={SUBSCRIPTION_STATUS_META[s].label} value={String(statusCounts[s])} icon={STATUS_ICON[s]} />
        ))}
      </div>

      <MembershipManagementFilters />

      <MembershipManagementTable data={rows} canOverride={canOverride} />
    </div>
  );
}
