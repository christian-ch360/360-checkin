import { Clock, CheckCircle2, Wallet } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import {
  listCommissionTiers,
  listCommissionTransactions,
  getCommissionSummary,
  getTopEarners,
} from "@/features/commissions/services/commissions.service";
import { hasPermission } from "@/lib/permissions";
import { StatCard } from "@/components/shared/stat-card";
import { TierManager } from "@/features/commissions/components/tier-manager";
import { CommissionTransactionsTable } from "@/features/commissions/components/commission-transactions-table";
import { LeaderboardCard } from "@/features/dashboard/components/leaderboard-card";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { formatCompactCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Commissions" };

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireCurrentMember();
  const canManage = hasPermission(actor.systemRole, "commissions.manage");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [tiers, commissionPage, summary, topEarners] = await Promise.all([
    listCommissionTiers(actor.organizationId),
    listCommissionTransactions(actor.organizationId, {}, page),
    getCommissionSummary(actor.organizationId),
    getTopEarners(actor.organizationId),
  ]);
  const { transactions } = commissionPage;

  return (
    <div className="space-y-8">
      <PageHeader title="Commission Center" description="Review, approve, and pay out member commissions." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={`Pending (${summary.pending.count})`} value={formatCompactCurrency(summary.pending.amount)} icon={Clock} accent="warning" />
        <StatCard label={`Approved (${summary.approved.count})`} value={formatCompactCurrency(summary.approved.amount)} icon={CheckCircle2} accent="primary" />
        <StatCard label={`Paid (${summary.paid.count})`} value={formatCompactCurrency(summary.paid.amount)} icon={Wallet} accent="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TierManager
          tiers={tiers.map((t) => ({ id: t.id, code: t.code, name: t.name, percentage: t.percentage.toString() }))}
          canManage={canManage}
        />
        <div className="lg:col-span-2">
          <LeaderboardCard
            title="Top earners"
            emptyLabel="No commission earned yet."
            entries={topEarners.map((e) => ({ id: e.id, name: e.name, gmv: e.amount, photoUrl: e.photoUrl, href: `/members/${e.id}` }))}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <CommissionTransactionsTable
            transactions={transactions.map((t) => ({
              id: t.id,
              tierCode: t.tierCode,
              percentage: t.percentage.toString(),
              gmvAmount: t.gmvAmount.toString(),
              commissionAmount: t.commissionAmount.toString(),
              status: t.status,
              createdAt: t.createdAt,
              member: t.member,
              project: t.project,
            }))}
            canManage={canManage}
          />
        </CardContent>
      </Card>
      <Pagination
        page={commissionPage.page}
        pageCount={commissionPage.pageCount}
        total={commissionPage.total}
        pageSize={commissionPage.pageSize}
      />
    </div>
  );
}
