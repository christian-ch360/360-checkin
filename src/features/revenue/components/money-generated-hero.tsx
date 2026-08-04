"use client";

import { useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/utils/format";
import type { MoneyGeneratedHero as MoneyGeneratedHeroData } from "@/features/revenue/services/revenue.service";

const chartConfig = {
  amount: { label: "Earnings", color: "var(--primary)" },
} satisfies ChartConfig;

type Period = "thisMonth" | "lastMonth" | "lifetime";

const PERIOD_LABELS: Record<Period, string> = {
  thisMonth: "This Month",
  lastMonth: "Last Month",
  lifetime: "Lifetime",
};

export function MoneyGeneratedHero({ data }: { data: MoneyGeneratedHeroData }) {
  const [period, setPeriod] = useState<Period>("thisMonth");

  const totalsByPeriod: Record<Period, number> = {
    thisMonth: data.summary.thisMonthTotal,
    lastMonth: data.summary.lastMonthTotal,
    lifetime: data.summary.lifetimeTotal,
  };
  const activeTotal = totalsByPeriod[period];
  const activeSeries = data.series[period];
  const hasData = activeSeries.some((p) => p.amount > 0);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="size-4 text-primary" />
            Money Generated
          </CardTitle>
          <CardDescription>Your total earnings through CreatorHub360</CardDescription>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <TabsTrigger key={p} value={p} className="text-xs">
                {PERIOD_LABELS[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <p className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {formatCurrency(activeTotal, { precise: true })}
          </p>
          {period === "thisMonth" && data.summary.growthPct !== null && (
            <span
              className={`mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                data.summary.growthPct >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              <TrendingUp className="size-3" />
              {data.summary.growthPct >= 0 ? "+" : ""}
              {formatPercent(data.summary.growthPct)} this month
            </span>
          )}
        </div>

        {!hasData ? (
          <EmptyState
            icon={DollarSign}
            title="No earnings yet"
            description="Once your brand deals, shop sales, or other activity is logged, your earnings will show up here."
            className="h-[220px] justify-center py-0"
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <LineChart data={activeSeries} margin={{ left: 0, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatCompactCurrency(Number(v))} width={56} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCompactCurrency(Number(value))} />} />
              <Line dataKey="amount" type="monotone" stroke="var(--color-amount)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
