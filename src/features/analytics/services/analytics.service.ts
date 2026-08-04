import "server-only";

import { subDays, subMonths, startOfDay, startOfMonth, format } from "date-fns";
import { unstable_cache } from "next/cache";
import type { RevenueChannel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getGMVHistoricalSeries, getLeaderboards } from "@/features/gmv/services/gmv.service";
import { CHANNEL_LABELS, NAMED_CHANNELS } from "@/features/revenue/config/revenue-channels";
import type { RevenueBreakdown } from "@/features/revenue/services/revenue.service";

export async function getOccupancyTrend(organizationId: string, days = 30) {
  const since = startOfDay(subDays(new Date(), days - 1));

  const checkIns = await prisma.checkIn.findMany({
    where: { checkIn: { gte: since }, member: { organizationId } },
    select: { checkIn: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = startOfDay(subDays(new Date(), days - 1 - i));
    buckets.set(format(d, "MMM d"), 0);
  }
  for (const c of checkIns) {
    const key = format(startOfDay(c.checkIn), "MMM d");
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, checkIns]) => ({ date, checkIns }));
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_BUCKETS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

export async function getAttendanceHeatmap(organizationId: string, days = 90) {
  const since = startOfDay(subDays(new Date(), days));

  const checkIns = await prisma.checkIn.findMany({
    where: { checkIn: { gte: since }, member: { organizationId } },
    select: { checkIn: true },
  });

  // grid[day][hourBucketIndex] = count
  const grid: number[][] = DAY_LABELS.map(() => HOUR_BUCKETS.map(() => 0));

  for (const c of checkIns) {
    const day = c.checkIn.getDay();
    const hour = c.checkIn.getHours();
    let bucketIndex = HOUR_BUCKETS.findIndex((h, i) => hour >= h && hour < (HOUR_BUCKETS[i + 1] ?? 24));
    if (bucketIndex === -1) bucketIndex = HOUR_BUCKETS.length - 1;
    grid[day][bucketIndex]++;
  }

  const max = Math.max(1, ...grid.flat());

  return {
    days: DAY_LABELS,
    hours: HOUR_BUCKETS.map((h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`),
    grid,
    max,
  };
}

export async function getSpaceUtilizationChart(organizationId: string) {
  const spaces = await prisma.space.findMany({
    where: { organizationId },
    include: {
      sessions: {
        where: { status: "COMPLETED", durationMin: { not: null } },
        select: { durationMin: true },
      },
    },
  });

  return spaces
    .map((s) => ({
      name: s.name,
      sessions: s.sessions.length,
      hours: Math.round((s.sessions.reduce((sum, sess) => sum + (sess.durationMin ?? 0), 0) / 60) * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours);
}

export async function getAnalyticsSummary(organizationId: string) {
  const [avgDurationAgg, activeMembers, totalMembers] = await Promise.all([
    prisma.checkIn.aggregate({
      where: { member: { organizationId }, duration: { not: null } },
      _avg: { duration: true },
    }),
    prisma.member.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.member.count({ where: { organizationId } }),
  ]);

  return {
    averageHours: Number(avgDurationAgg._avg.duration ?? 0) / 60,
    activeMembers,
    totalMembers,
  };
}

// Org-wide sibling of revenue.service.ts's getRevenueBreakdownByChannel,
// which is scoped to a single creator's own GMVTransaction rows. Same
// groupBy shape, just widened to every member in the organization.
export async function getOrgRevenueBreakdownByChannel(organizationId: string): Promise<RevenueBreakdown> {
  const grouped = await prisma.gMVTransaction.groupBy({
    by: ["channel"],
    where: { member: { organizationId } },
    _sum: { amount: true },
  });

  const amounts = new Map<RevenueChannel, number>();
  for (const c of [...NAMED_CHANNELS, "OTHER" as RevenueChannel]) amounts.set(c, 0);
  for (const g of grouped) amounts.set(g.channel, Number(g._sum.amount ?? 0));

  const total = Array.from(amounts.values()).reduce((sum, v) => sum + v, 0);
  const otherAmount = amounts.get("OTHER") ?? 0;

  const channels = NAMED_CHANNELS.map((channel) => {
    const amount = amounts.get(channel) ?? 0;
    return { channel, label: CHANNEL_LABELS[channel], amount, percentOfTotal: total > 0 ? (amount / total) * 100 : 0 };
  }).sort((a, b) => b.amount - a.amount);

  return { channels, otherAmount, total };
}

export type CommunityEngagementTrend = {
  daily: { date: string; posts: number; applications: number; messages: number }[];
  activeMembers: number;
};

export async function getCommunityEngagementTrend(organizationId: string, days = 30): Promise<CommunityEngagementTrend> {
  const since = startOfDay(subDays(new Date(), days - 1));

  const [posts, applications, messages] = await Promise.all([
    prisma.collabPost.findMany({ where: { organizationId, createdAt: { gte: since } }, select: { createdAt: true, memberId: true } }),
    prisma.application.findMany({
      where: { collabPost: { organizationId }, createdAt: { gte: since } },
      select: { createdAt: true, applicantId: true },
    }),
    prisma.message.findMany({
      where: { conversation: { organizationId }, createdAt: { gte: since } },
      select: { createdAt: true, senderId: true },
    }),
  ]);

  const buckets = new Map<string, { posts: number; applications: number; messages: number }>();
  for (let i = 0; i < days; i++) {
    const d = startOfDay(subDays(new Date(), days - 1 - i));
    buckets.set(format(d, "MMM d"), { posts: 0, applications: 0, messages: 0 });
  }
  for (const p of posts) {
    const key = format(startOfDay(p.createdAt), "MMM d");
    const bucket = buckets.get(key);
    if (bucket) bucket.posts++;
  }
  for (const a of applications) {
    const key = format(startOfDay(a.createdAt), "MMM d");
    const bucket = buckets.get(key);
    if (bucket) bucket.applications++;
  }
  for (const m of messages) {
    const key = format(startOfDay(m.createdAt), "MMM d");
    const bucket = buckets.get(key);
    if (bucket) bucket.messages++;
  }

  const activeMemberIds = new Set<string>([
    ...posts.map((p) => p.memberId),
    ...applications.map((a) => a.applicantId),
    ...messages.map((m) => m.senderId),
  ]);

  return {
    daily: Array.from(buckets.entries()).map(([date, counts]) => ({ date, ...counts })),
    activeMembers: activeMemberIds.size,
  };
}

export type MemberGrowthPoint = { month: string; newMembers: number; cumulative: number };

export async function getMemberGrowthTrend(organizationId: string, months = 6): Promise<MemberGrowthPoint[]> {
  const since = startOfMonth(subMonths(new Date(), months - 1));

  const [priorCount, rows] = await Promise.all([
    prisma.member.count({ where: { organizationId, createdAt: { lt: since } } }),
    prisma.member.findMany({ where: { organizationId, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = subMonths(new Date(), months - 1 - i);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const r of rows) {
    const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  let cumulative = priorCount;
  return Array.from(buckets.entries()).map(([key, newMembers]) => {
    cumulative += newMembers;
    const [year, monthNum] = key.split("-").map(Number);
    return { month: format(new Date(year, monthNum - 1, 1), "MMM"), newMembers, cumulative };
  });
}

/**
 * Analytics page load, cached 60s per organization. Deliberately defined
 * here rather than alongside getGMVHistoricalSeries/getLeaderboards in
 * gmv.service.ts — those two are shared with the (uncached, always-fresh)
 * GMV page, and wrapping them at their source would cache them there too.
 * Every value returned by the wrapped functions is already a plain
 * number/string (verified — no Date or Prisma Decimal survives past this
 * feature's own service functions), so unstable_cache's JSON round-trip
 * is safe with no rehydration needed, unlike the dashboard bundle.
 */
const getCachedAnalyticsBundle = unstable_cache(
  async (organizationId: string) => {
    const [summary, occupancyTrend, heatmap, spaceUtilization, gmvSeries, leaderboards, revenueBreakdown, communityEngagement, memberGrowth] =
      await Promise.all([
        getAnalyticsSummary(organizationId),
        getOccupancyTrend(organizationId),
        getAttendanceHeatmap(organizationId),
        getSpaceUtilizationChart(organizationId),
        getGMVHistoricalSeries(organizationId),
        getLeaderboards(organizationId),
        getOrgRevenueBreakdownByChannel(organizationId),
        getCommunityEngagementTrend(organizationId),
        getMemberGrowthTrend(organizationId),
      ]);
    return { summary, occupancyTrend, heatmap, spaceUtilization, gmvSeries, leaderboards, revenueBreakdown, communityEngagement, memberGrowth };
  },
  ["analytics-bundle"],
  { revalidate: 60 }
);

export async function getCachedAnalyticsData(organizationId: string) {
  return getCachedAnalyticsBundle(organizationId);
}
