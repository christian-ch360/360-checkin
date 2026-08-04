import { Clock, Users, UserCheck } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getCachedAnalyticsData } from "@/features/analytics/services/analytics.service";
import { StatCard } from "@/components/shared/stat-card";
import { GMVTrendChart } from "@/features/dashboard/components/gmv-trend-chart";
import { OccupancyTrendChart } from "@/features/analytics/components/occupancy-trend-chart";
import { SpaceUtilizationChart } from "@/features/analytics/components/space-utilization-chart";
import { AttendanceHeatmap } from "@/features/analytics/components/attendance-heatmap";
import { LeaderboardCard } from "@/features/dashboard/components/leaderboard-card";
import { RevenueBreakdownCard } from "@/features/revenue/components/revenue-breakdown-card";
import { CommunityEngagementChart } from "@/features/analytics/components/community-engagement-chart";
import { MemberGrowthChart } from "@/features/analytics/components/member-growth-chart";
import { isDemoModeActive, demoGetCachedAnalyticsData } from "@/features/demo-data";
import { formatHours } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const actor = await requireCurrentMember();

  const { summary, occupancyTrend, heatmap, spaceUtilization, gmvSeries, leaderboards, revenueBreakdown, communityEngagement, memberGrowth } =
    isDemoModeActive(actor) ? demoGetCachedAnalyticsData() : await getCachedAnalyticsData(actor.organizationId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">Facility usage, GMV growth, and performance trends.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active members" value={`${summary.activeMembers} / ${summary.totalMembers}`} icon={Users} accent="primary" />
        <StatCard label="Average session" value={formatHours(summary.averageHours)} icon={Clock} />
        <StatCard label="Retention" value={`${Math.round((summary.activeMembers / Math.max(1, summary.totalMembers)) * 100)}%`} icon={UserCheck} accent="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GMVTrendChart data={gmvSeries} />
        <OccupancyTrendChart data={occupancyTrend} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AttendanceHeatmap {...heatmap} />
        <SpaceUtilizationChart data={spaceUtilization} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RevenueBreakdownCard data={revenueBreakdown} />
        <CommunityEngagementChart data={communityEngagement} />
        <MemberGrowthChart data={memberGrowth} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LeaderboardCard
          title="Top creators"
          emptyLabel="No data yet."
          entries={leaderboards.creators.map((c) => ({ id: c.id, name: c.name, gmv: c.gmv, photoUrl: c.photoUrl, href: `/members/${c.id}` }))}
        />
        <LeaderboardCard
          title="Top brands"
          emptyLabel="No data yet."
          entries={leaderboards.brands.map((b) => ({ id: b.id, name: b.name, gmv: b.gmv, href: `/brands/${b.id}` }))}
        />
        <LeaderboardCard
          title="Top agencies"
          emptyLabel="No data yet."
          entries={leaderboards.agencies.map((c) => ({ id: c.id, name: c.name, gmv: c.gmv, photoUrl: c.photoUrl, href: `/members/${c.id}` }))}
        />
        <LeaderboardCard
          title="Top projects"
          emptyLabel="No data yet."
          entries={leaderboards.projects.map((p) => ({ id: p.id, name: p.name, gmv: p.gmv, href: `/projects/${p.id}` }))}
        />
      </div>
    </div>
  );
}
