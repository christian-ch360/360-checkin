"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  cumulative: { label: "Total members", color: "var(--primary)" },
} satisfies ChartConfig;

export function MemberGrowthChart({ data }: { data: { month: string; newMembers: number; cumulative: number }[] }) {
  const hasGrowth = data.some((d) => d.newMembers > 0);

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Member growth</CardTitle>
        <CardDescription>Total members over time</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasGrowth && data.every((d) => d.cumulative === 0) ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No members yet.</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-cumulative)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-cumulative)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="cumulative" type="monotone" fill="url(#fillCumulative)" stroke="var(--color-cumulative)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
