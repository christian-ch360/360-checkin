"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  posts: { label: "Posts", color: "var(--chart-1)" },
  applications: { label: "Applications", color: "var(--chart-2)" },
  messages: { label: "Messages", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function CommunityEngagementChart({
  data,
}: {
  data: { daily: { date: string; posts: number; applications: number; messages: number }[]; activeMembers: number };
}) {
  const hasActivity = data.daily.some((d) => d.posts + d.applications + d.messages > 0);

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Community engagement</CardTitle>
        <CardDescription>{data.activeMembers} active member{data.activeMembers === 1 ? "" : "s"} in the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No community activity yet.</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={data.daily} margin={{ left: 0, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="posts" stackId="engagement" fill="var(--color-posts)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="applications" stackId="engagement" fill="var(--color-applications)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="messages" stackId="engagement" fill="var(--color-messages)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
