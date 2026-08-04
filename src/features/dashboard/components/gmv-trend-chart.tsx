"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactCurrency } from "@/lib/utils/format";

const chartConfig = {
  gmv: {
    label: "GMV",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function GMVTrendChart({ data }: { data: { month: string; gmv: number }[] }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>GMV trend</CardTitle>
        <CardDescription>Gross merchandise value by month</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            No GMV recorded yet.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="fillGmv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-gmv)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-gmv)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => formatCompactCurrency(Number(v))}
                width={56}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCompactCurrency(Number(value))}
                  />
                }
              />
              <Area
                dataKey="gmv"
                type="monotone"
                fill="url(#fillGmv)"
                stroke="var(--color-gmv)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
