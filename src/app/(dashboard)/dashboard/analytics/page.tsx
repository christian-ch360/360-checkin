import { redirect } from "next/navigation";
import { Clock, QrCode, DollarSign, TrendingUp, Percent } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getCachedDashboardData } from "@/features/dashboard/services/dashboard.service";
import { hasPermission } from "@/lib/permissions";
import { StatCard } from "@/components/shared/stat-card";
import { GMVTrendChart } from "@/features/dashboard/components/gmv-trend-chart";
import { LeaderboardCard } from "@/features/dashboard/components/leaderboard-card";
import { formatCompactCurrency, formatHours } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function DashboardAnalyticsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "reports.view")) redirect("/dashboard");

  const { todayStats, gmvSeries, topPerformers, yearlyGMV, activeCommissionTiers } = await getCachedDashboardData(
    actor.organizationId
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Today's check-ins" value={String(todayStats.checkIns)} icon={QrCode} />
        <StatCard label="Today's hours" value={formatHours(todayStats.hours)} icon={Clock} />
        <StatCard label="Today's GMV" value={formatCompactCurrency(todayStats.gmv)} icon={DollarSign} />
        <StatCard label="YTD GMV" value={formatCompactCurrency(yearlyGMV)} icon={TrendingUp} />
        <StatCard label="Active commission tiers" value={String(activeCommissionTiers)} icon={Percent} />
      </div>

      <GMVTrendChart data={gmvSeries} />

      <div className="grid gap-4 lg:grid-cols-3">
        <LeaderboardCard
          title="Top creators"
          emptyLabel="No creator GMV yet."
          entries={topPerformers.topCreators.map((c) => ({
            id: c.id,
            name: c.name,
            gmv: c.gmv,
            photoUrl: c.photoUrl,
            href: `/members/${c.id}`,
          }))}
        />
        <LeaderboardCard
          title="Top brands"
          emptyLabel="No brand GMV yet."
          entries={topPerformers.topBrands.map((b) => ({ id: b.id, name: b.name, gmv: b.gmv, href: `/brands/${b.id}` }))}
        />
        <LeaderboardCard
          title="Top projects"
          emptyLabel="No project GMV yet."
          entries={topPerformers.topProjects.map((p) => ({ id: p.id, name: p.name, gmv: p.gmv, href: `/projects/${p.id}` }))}
        />
      </div>
    </div>
  );
}
