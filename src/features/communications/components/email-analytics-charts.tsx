"use client";

import { Area, AreaChart, Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { EmailAnalyticsBundle } from "@/features/communications/services/email-analytics.service";

const sentPerDayConfig = {
  sent: { label: "Sent", color: "var(--chart-1)" },
  failed: { label: "Failed", color: "var(--chart-4)" },
} satisfies ChartConfig;

const rateTrendConfig = {
  deliveryRate: { label: "Delivery rate", color: "var(--chart-1)" },
  openRate: { label: "Open rate", color: "var(--chart-2)" },
  clickRate: { label: "Click rate", color: "var(--chart-3)" },
} satisfies ChartConfig;

const templateUsageConfig = {
  count: { label: "Sends", color: "var(--primary)" },
} satisfies ChartConfig;

const categoryConfig = {
  count: { label: "Emails", color: "var(--chart-2)" },
} satisfies ChartConfig;

const failureRateConfig = {
  failureRate: { label: "Failure rate", color: "var(--chart-4)" },
} satisfies ChartConfig;

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{label}</div>;
}

export function EmailAnalyticsCharts({ data }: { data: EmailAnalyticsBundle }) {
  const hasSends = data.sentPerDay.some((d) => d.sent + d.failed > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Emails sent per day</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSends ? (
            <EmptyChart label="No emails sent yet." />
          ) : (
            <ChartContainer config={sentPerDayConfig} className="h-[220px] w-full">
              <AreaChart data={data.sentPerDay} margin={{ left: 0, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="fillSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-sent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-sent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="sent" type="monotone" fill="url(#fillSent)" stroke="var(--color-sent)" strokeWidth={2} />
                <Area dataKey="failed" type="monotone" fill="none" stroke="var(--color-failed)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Delivery, open &amp; click rate</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSends ? (
            <EmptyChart label="No data yet." />
          ) : (
            <ChartContainer config={rateTrendConfig} className="h-[220px] w-full">
              <LineChart data={data.rateTrend} margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line dataKey="deliveryRate" type="monotone" stroke="var(--color-deliveryRate)" strokeWidth={2} dot={false} />
                <Line dataKey="openRate" type="monotone" stroke="var(--color-openRate)" strokeWidth={2} dot={false} />
                <Line dataKey="clickRate" type="monotone" stroke="var(--color-clickRate)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Template usage</CardTitle>
          <CardDescription>Most-sent templates, all time</CardDescription>
        </CardHeader>
        <CardContent>
          {data.templateUsage.length === 0 ? (
            <EmptyChart label="No emails sent yet." />
          ) : (
            <ChartContainer config={templateUsageConfig} className="h-[220px] w-full">
              <BarChart data={data.templateUsage} layout="vertical" margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="template"
                  tickLine={false}
                  axisLine={false}
                  width={140}
                  tickFormatter={(v: string) => v.replace(/_/g, " ")}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Most active category</CardTitle>
          <CardDescription>Emails by category, all time</CardDescription>
        </CardHeader>
        <CardContent>
          {data.categoryBreakdown.length === 0 ? (
            <EmptyChart label="No emails sent yet." />
          ) : (
            <ChartContainer config={categoryConfig} className="h-[220px] w-full">
              <BarChart data={data.categoryBreakdown} layout="vertical" margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle>Failure rate</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSends ? (
            <EmptyChart label="No emails sent yet." />
          ) : (
            <ChartContainer config={failureRateConfig} className="h-[200px] w-full">
              <LineChart data={data.failureRate} margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="failureRate" type="monotone" stroke="var(--color-failureRate)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
