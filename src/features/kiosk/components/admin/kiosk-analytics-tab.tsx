"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";
import type { KioskThemeAnalytics, KioskDailyInteractionPoint } from "@/features/kiosk/services/kiosk-analytics.service";

const timeSeriesConfig = {
  views: { label: "Theme Views", color: "var(--chart-1)" },
  qrScans: { label: "QR Scans", color: "var(--chart-2)" },
  checkIns: { label: "Check-Ins", color: "var(--chart-3)" },
  registrations: { label: "Registrations", color: "var(--chart-4)" },
  ctaClicks: { label: "CTA Clicks", color: "var(--chart-5)" },
} satisfies ChartConfig;

type ThemeRow = { themeKey: string; name: string; status: string };

export function KioskAnalyticsTab({
  themes,
  analytics,
  timeSeries,
}: {
  themes: ThemeRow[];
  analytics: Record<string, KioskThemeAnalytics>;
  timeSeries: KioskDailyInteractionPoint[];
}) {
  const hasActivity = timeSeries.some((d) => d.views + d.qrScans + d.checkIns + d.registrations + d.ctaClicks + d.eventSignups > 0);

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Interactions over time</CardTitle>
          <CardDescription>Last 30 days, all themes combined</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasActivity ? (
            <EmptyState icon={BarChart3} title="No interactions recorded yet" description="Data appears here once the kiosk starts recording views, scans, and check-ins." />
          ) : (
            <ChartContainer config={timeSeriesConfig} className="h-[280px] w-full">
              <LineChart data={timeSeries} margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="qrScans" stroke="var(--color-qrScans)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="checkIns" stroke="var(--color-checkIns)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="registrations" stroke="var(--color-registrations)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ctaClicks" stroke="var(--color-ctaClicks)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Performance by theme</CardTitle>
          <CardDescription>All-time totals</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Theme</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">QR Scans</TableHead>
                  <TableHead className="text-right">Check-Ins</TableHead>
                  <TableHead className="text-right">Registrations</TableHead>
                  <TableHead className="text-right">CTA Clicks</TableHead>
                  <TableHead className="text-right">Event Sign-Ups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {themes.map((theme) => {
                  const stats = analytics[theme.themeKey];
                  return (
                    <TableRow key={theme.themeKey}>
                      <TableCell className="font-medium">{theme.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{stats?.views ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{stats?.qrScans ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{stats?.checkIns ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{stats?.registrations ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{stats?.ctaClicks ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{stats?.eventSignups ?? 0}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
