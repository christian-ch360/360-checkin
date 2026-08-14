import { redirect } from "next/navigation";
import type { ReferralStatus } from "@prisma/client";
import { FileText, CheckCircle2, UserCheck, Percent } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import {
  getReferralAnalytics,
  getReferralLeaderboard,
  getReferralHistory,
} from "@/features/referrals/services/referral.service";
import { StatCard } from "@/components/shared/stat-card";
import { TopReferrersLeaderboard } from "@/features/referrals/components/top-referrers-leaderboard";
import { ReferralHistoryFilters } from "@/features/referrals/components/referral-history-filters";
import { ReferralHistoryTable, type ReferralHistoryRow } from "@/features/referrals/components/referral-history-table";
import { formatPercent } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Referral Analytics" };

const VALID_STATUSES: ReferralStatus[] = ["PENDING", "ACTIVE", "REJECTED", "TRANSFERRED"];

export default async function AdminReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; from?: string; to?: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "referrals.view")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status = VALID_STATUSES.find((s) => s === params.status);

  const [analytics, leaderboard, history] = await Promise.all([
    getReferralAnalytics(actor.organizationId),
    getReferralLeaderboard(actor.organizationId),
    getReferralHistory(actor.organizationId, {
      search: params.search,
      status,
      dateFrom: params.from ? new Date(params.from) : undefined,
      dateTo: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
    }),
  ]);

  const rows: ReferralHistoryRow[] = history.map((h) => ({
    id: h.id,
    referrerName: h.referrerName,
    referrerId: h.referrerId,
    applicantName: h.applicantName,
    referralCode: h.referralCode,
    applicationDate: h.applicationDate.toISOString(),
    status: h.status,
    approvalDate: h.approvalDate?.toISOString() ?? null,
    memberStatus: h.memberStatus,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Referral Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Track referral applications, approvals, and top referrers across the organization.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Applications" value={String(analytics.totalApplications)} icon={FileText} />
        <StatCard label="Approved Applications" value={String(analytics.approvedApplications)} icon={CheckCircle2} accent="success" />
        <StatCard label="Active Referred Members" value={String(analytics.activeReferredMembers)} icon={UserCheck} accent="primary" />
        <StatCard label="Conversion Rate" value={formatPercent(analytics.conversionRate * 100)} icon={Percent} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <ReferralHistoryFilters />
          <ReferralHistoryTable data={rows} />
        </div>
        <TopReferrersLeaderboard entries={leaderboard} />
      </div>
    </div>
  );
}
