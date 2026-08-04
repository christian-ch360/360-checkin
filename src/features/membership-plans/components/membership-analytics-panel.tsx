import { Card, CardContent } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/utils/format";
import type { MembershipAnalytics } from "@/features/membership-plans/services/membership-analytics.service";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function MembershipAnalyticsPanel({ analytics }: { analytics: MembershipAnalytics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR" value={formatCompactCurrency(analytics.mrrCents / 100)} sub={`${analytics.activeCount} paying members`} />
        <StatCard label="ARR" value={formatCompactCurrency(analytics.arrCents / 100)} />
        <StatCard label="Trial Conversion Rate" value={analytics.trialConversionRate != null ? `${analytics.trialConversionRate}%` : "—"} />
        <StatCard label="Churn Rate" value={analytics.churnRate != null ? `${analytics.churnRate}%` : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Trialing" value={String(analytics.trialingCount)} />
        <StatCard label="Canceled (grace)" value={String(analytics.canceledCount)} />
        <StatCard label="Expired" value={String(analytics.expiredCount)} />
        <StatCard label="Upgrades (30d)" value={String(analytics.last30Days.UPGRADED)} sub={`${analytics.last30Days.DOWNGRADED} downgrades`} />
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium">Members by Package</p>
          <div className="mt-3 space-y-2">
            {analytics.membersByPackage.length === 0 && <p className="text-sm text-muted-foreground">No active members yet.</p>}
            {analytics.membersByPackage.map((p) => (
              <div key={p.planId} className="flex items-center justify-between text-sm">
                <span>{p.planName}</span>
                <span className="font-medium tabular-nums">{p.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium">Lifecycle events (last 30 days)</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Trial conversions</dt>
              <dd className="text-sm font-medium tabular-nums">{analytics.last30Days.TRIAL_CONVERTED}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Upgrades</dt>
              <dd className="text-sm font-medium tabular-nums">{analytics.last30Days.UPGRADED}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Downgrades</dt>
              <dd className="text-sm font-medium tabular-nums">{analytics.last30Days.DOWNGRADED}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Cancellations</dt>
              <dd className="text-sm font-medium tabular-nums">{analytics.last30Days.CANCELED}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
