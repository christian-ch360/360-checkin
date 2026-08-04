import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { CHANNEL_LABELS } from "@/features/revenue/config/revenue-channels";
import type { RevenueBreakdown } from "@/features/revenue/services/revenue.service";

export function RevenueBreakdownCard({ data }: { data: RevenueBreakdown }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Revenue Breakdown</CardTitle>
        <CardDescription>Where your earnings are coming from</CardDescription>
      </CardHeader>
      <CardContent>
        {data.total === 0 ? (
          <EmptyState
            icon={PieChart}
            title="No revenue sources yet"
            description="Log a brand deal, shop sale, or other transaction to see your breakdown by channel."
          />
        ) : (
          <div className="space-y-4">
            {data.channels.map((c) => (
              <div key={c.channel} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="tabular-nums">{formatCurrency(c.amount)}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                      {formatPercent(c.percentOfTotal)}
                    </span>
                  </span>
                </div>
                <Progress value={c.percentOfTotal} />
              </div>
            ))}
            {data.otherAmount > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm text-muted-foreground">
                  <span className="font-medium">{CHANNEL_LABELS.OTHER}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="tabular-nums">{formatCurrency(data.otherAmount)}</span>
                    <span className="w-10 text-right text-xs tabular-nums">
                      {formatPercent((data.otherAmount / data.total) * 100)}
                    </span>
                  </span>
                </div>
                <Progress value={(data.otherAmount / data.total) * 100} />
              </div>
            )}

            <div className="flex items-baseline justify-between border-t pt-4">
              <span className="text-sm font-medium">Total Revenue</span>
              <span className="text-xl font-semibold tabular-nums">{formatCurrency(data.total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
