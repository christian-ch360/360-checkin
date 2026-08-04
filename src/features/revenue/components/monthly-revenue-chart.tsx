"use client";

import { Bar, ComposedChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCompactCurrency } from "@/lib/utils/format";
import type { MonthlyRevenuePoint } from "@/features/revenue/services/revenue.service";

const chartConfig = {
  monthly: { label: "Monthly", color: "var(--primary)" },
  cumulative: { label: "Cumulative", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function MonthlyRevenueChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const hasData = data.some((p) => p.monthly > 0);

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Monthly Revenue</CardTitle>
        <CardDescription>Earnings by month, plus your running total</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            No data yet — your monthly revenue will appear here once you have earnings.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => formatCompactCurrency(Number(v))}
                width={56}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => formatCompactCurrency(Number(v))}
                width={56}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCompactCurrency(Number(value))} />} />
              <Bar yAxisId="left" dataKey="monthly" fill="var(--color-monthly)" radius={4} />
              <Line yAxisId="right" dataKey="cumulative" type="monotone" stroke="var(--color-cumulative)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
