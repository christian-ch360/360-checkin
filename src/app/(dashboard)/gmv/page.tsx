import { DollarSign, TrendingUp, CalendarDays, Hash } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import {
  getGMVSummary,
  getGMVHistoricalSeries,
  getLeaderboards,
  listGMVTransactions,
} from "@/features/gmv/services/gmv.service";
import { listOrgMembers, listOrgBrandsAndClients } from "@/features/projects/services/projects.service";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions";
import { StatCard } from "@/components/shared/stat-card";
import { GMVTrendChart } from "@/features/dashboard/components/gmv-trend-chart";
import { LeaderboardCard } from "@/features/dashboard/components/leaderboard-card";
import { GMVEntryForm } from "@/features/gmv/components/gmv-entry-form";
import { GMVTransactionsTable } from "@/features/gmv/components/gmv-transactions-table";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ExportReportButton } from "@/features/reports/components/export-report-button";
import { formatCompactCurrency, formatPercent } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "GMV" };

export default async function GMVPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireCurrentMember();
  const canManage = hasPermission(actor.systemRole, "gmv.manage");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [summary, series, leaderboards, gmvPage, members, { brands, companies }, projects] = await Promise.all([
    getGMVSummary(actor.organizationId),
    getGMVHistoricalSeries(actor.organizationId),
    getLeaderboards(actor.organizationId),
    listGMVTransactions(actor.organizationId, page),
    listOrgMembers(actor.organizationId),
    listOrgBrandsAndClients(actor.organizationId),
    prisma.project.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const { transactions } = gmvPage;

  return (
    <div className="space-y-8">
      <PageHeader
        title="GMV"
        description="Gross merchandise value across the campus."
        actions={
          <div className="flex items-center gap-2">
            {hasPermission(actor.systemRole, "reports.export") && <ExportReportButton type="gmv" label="Export GMV" />}
            {canManage && <GMVEntryForm members={members} projects={projects} companies={companies} brands={brands} />}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="This month" value={formatCompactCurrency(summary.monthTotal)} icon={DollarSign} accent="success" />
        <StatCard
          label="Month over month"
          value={summary.growthPct === null ? "—" : formatPercent(summary.growthPct)}
          icon={TrendingUp}
          accent={summary.growthPct !== null && summary.growthPct < 0 ? "warning" : "primary"}
        />
        <StatCard label="Year to date" value={formatCompactCurrency(summary.yearTotal)} icon={CalendarDays} />
        <StatCard label="All-time transactions" value={String(summary.allTimeCount)} icon={Hash} />
      </div>

      <GMVTrendChart data={series} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LeaderboardCard
          title="Top creators"
          emptyLabel="No creator GMV yet."
          entries={leaderboards.creators.map((c) => ({ id: c.id, name: c.name, gmv: c.gmv, photoUrl: c.photoUrl, href: `/members/${c.id}` }))}
        />
        <LeaderboardCard
          title="Top agencies"
          emptyLabel="No agency GMV yet."
          entries={leaderboards.agencies.map((c) => ({ id: c.id, name: c.name, gmv: c.gmv, photoUrl: c.photoUrl, href: `/members/${c.id}` }))}
        />
        <LeaderboardCard
          title="Top brokers"
          emptyLabel="No broker GMV yet."
          entries={leaderboards.brokers.map((c) => ({ id: c.id, name: c.name, gmv: c.gmv, photoUrl: c.photoUrl, href: `/members/${c.id}` }))}
        />
        <LeaderboardCard
          title="Top brands"
          emptyLabel="No brand GMV yet."
          entries={leaderboards.brands.map((b) => ({ id: b.id, name: b.name, gmv: b.gmv, href: `/brands/${b.id}` }))}
        />
        <LeaderboardCard
          title="Top companies"
          emptyLabel="No company GMV yet."
          entries={leaderboards.companies.map((c) => ({ id: c.id, name: c.name, gmv: c.gmv, href: `/companies/${c.id}` }))}
        />
        <LeaderboardCard
          title="Top projects"
          emptyLabel="No project GMV yet."
          entries={leaderboards.projects.map((p) => ({ id: p.id, name: p.name, gmv: p.gmv, href: `/projects/${p.id}` }))}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <GMVTransactionsTable
            transactions={transactions.map((t) => ({
              id: t.id,
              amount: t.amount.toString(),
              transactionDate: t.transactionDate,
              description: t.description,
              member: t.member,
              project: t.project,
              company: t.company,
              brand: t.brand,
            }))}
          />
        </CardContent>
      </Card>
      <Pagination page={gmvPage.page} pageCount={gmvPage.pageCount} total={gmvPage.total} pageSize={gmvPage.pageSize} />
    </div>
  );
}
