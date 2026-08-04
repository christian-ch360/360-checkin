import { MoneyGeneratedHero } from "@/features/revenue/components/money-generated-hero";
import { RevenueBreakdownCard } from "@/features/revenue/components/revenue-breakdown-card";
import { MonthlyRevenueChart } from "@/features/revenue/components/monthly-revenue-chart";
import { RevenueGoalCard } from "@/features/revenue/components/revenue-goal-card";
import { TopRevenueSourcesCard } from "@/features/revenue/components/top-revenue-sources-card";
import type {
  MoneyGeneratedHero as MoneyGeneratedHeroData,
  RevenueBreakdown,
  MonthlyRevenuePoint,
  TopRevenueSource,
  RevenueGoalSummary,
} from "@/features/revenue/services/revenue.service";
import { SUBSCRIPTION_STATUS_META } from "@/features/membership-plans/config/subscription-status-meta";
import {
  MembershipOverview,
  type MembershipOverviewData,
  type MembershipOverviewSwitchablePlan,
} from "@/features/creator-dashboard/components/membership-overview";

export { SUBSCRIPTION_STATUS_META };

export function MembershipTab({
  membership,
  switchablePlans,
  moneyGeneratedHero,
  revenueBreakdown,
  monthlyRevenueSeries,
  topRevenueSources,
  revenueGoal,
}: {
  membership: MembershipOverviewData;
  switchablePlans: MembershipOverviewSwitchablePlan[];
  moneyGeneratedHero: MoneyGeneratedHeroData;
  revenueBreakdown: RevenueBreakdown;
  monthlyRevenueSeries: MonthlyRevenuePoint[];
  topRevenueSources: TopRevenueSource[];
  revenueGoal: RevenueGoalSummary | null;
}) {
  return (
    <div className="space-y-6">
      {/* Money Generated is the primary KPI on this tab — always shown, independent of membership status. */}
      <div className="space-y-4">
        <MoneyGeneratedHero data={moneyGeneratedHero} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RevenueBreakdownCard data={revenueBreakdown} />
          <MonthlyRevenueChart data={monthlyRevenueSeries} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RevenueGoalCard goal={revenueGoal} />
          <TopRevenueSourcesCard sources={topRevenueSources} />
        </div>
      </div>

      <MembershipOverview membership={membership} switchablePlans={switchablePlans} />
    </div>
  );
}
