import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/format";
import { CHANNEL_LABELS } from "@/features/revenue/config/revenue-channels";
import type { TopRevenueSource } from "@/features/revenue/services/revenue.service";

export function TopRevenueSourcesCard({ sources }: { sources: TopRevenueSource[] }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Top Revenue Sources</CardTitle>
        <CardDescription>What&apos;s making you the most money</CardDescription>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <EmptyState icon={Trophy} title="No revenue sources yet" description="Your highest-earning deals and channels will show up here." />
        ) : (
          <ul className="space-y-3">
            {sources.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.label}</p>
                  <Badge variant="outline" className="mt-0.5 text-[10px] font-normal">
                    {CHANNEL_LABELS[s.channel]}
                  </Badge>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(s.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
