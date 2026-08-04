import "server-only";

import { startOfMonth, startOfYear, subMonths, endOfMonth, eachDayOfInterval, addMonths, format } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import type { RevenueChannel } from "@prisma/client";
import { CHANNEL_LABELS, NAMED_CHANNELS } from "@/features/revenue/config/revenue-channels";

/**
 * The creator's own "Money Generated" numbers — every query here is scoped
 * by memberId, never organizationId. This is the personal counterpart to
 * gmv.service.ts's org-wide aggregates.
 */

export type MoneyGeneratedHero = {
  summary: { thisMonthTotal: number; lastMonthTotal: number; lifetimeTotal: number; growthPct: number | null };
  series: {
    thisMonth: { label: string; amount: number }[];
    lastMonth: { label: string; amount: number }[];
    lifetime: { label: string; amount: number }[];
  };
};

// A single pass over the member's own transactions (personal-scale data,
// not org-wide) — simpler and cheap enough to bucket in memory rather than
// running the 3+ separate aggregate queries gmv.service.ts uses for its
// org-wide equivalent.
export async function getMoneyGeneratedHero(memberId: string): Promise<MoneyGeneratedHero> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(lastMonthStart);

  const rows = await prisma.gMVTransaction.findMany({
    where: { memberId },
    select: { amount: true, transactionDate: true },
    orderBy: { transactionDate: "asc" },
  });

  const thisMonthByDay = new Map<string, number>();
  for (const d of eachDayOfInterval({ start: monthStart, end: now })) {
    thisMonthByDay.set(format(d, "MMM d"), 0);
  }
  const lastMonthByDay = new Map<string, number>();
  for (const d of eachDayOfInterval({ start: lastMonthStart, end: lastMonthEnd })) {
    lastMonthByDay.set(format(d, "MMM d"), 0);
  }
  const lifetimeByMonth = new Map<string, number>();

  let thisMonthTotal = 0;
  let lastMonthTotal = 0;
  let lifetimeTotal = 0;

  for (const row of rows) {
    const amount = Number(row.amount);
    lifetimeTotal += amount;

    const monthKey = format(row.transactionDate, "yyyy-MM");
    lifetimeByMonth.set(monthKey, (lifetimeByMonth.get(monthKey) ?? 0) + amount);

    if (row.transactionDate >= monthStart) {
      thisMonthTotal += amount;
      const dayKey = format(row.transactionDate, "MMM d");
      if (thisMonthByDay.has(dayKey)) thisMonthByDay.set(dayKey, (thisMonthByDay.get(dayKey) ?? 0) + amount);
    } else if (row.transactionDate >= lastMonthStart && row.transactionDate <= lastMonthEnd) {
      lastMonthTotal += amount;
      const dayKey = format(row.transactionDate, "MMM d");
      if (lastMonthByDay.has(dayKey)) lastMonthByDay.set(dayKey, (lastMonthByDay.get(dayKey) ?? 0) + amount);
    }
  }

  const growthPct = lastMonthTotal === 0 ? null : ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;

  const lifetimeSeries: { label: string; amount: number }[] = [];
  if (rows.length > 0) {
    let cursor = startOfMonth(rows[0].transactionDate);
    const end = monthStart;
    while (cursor <= end) {
      lifetimeSeries.push({
        label: format(cursor, "MMM yyyy"),
        amount: lifetimeByMonth.get(format(cursor, "yyyy-MM")) ?? 0,
      });
      cursor = addMonths(cursor, 1);
    }
  }

  return {
    summary: { thisMonthTotal, lastMonthTotal, lifetimeTotal, growthPct },
    series: {
      thisMonth: Array.from(thisMonthByDay, ([label, amount]) => ({ label, amount })),
      lastMonth: Array.from(lastMonthByDay, ([label, amount]) => ({ label, amount })),
      lifetime: lifetimeSeries,
    },
  };
}

export type RevenueBreakdown = {
  channels: { channel: RevenueChannel; label: string; amount: number; percentOfTotal: number }[];
  otherAmount: number;
  total: number;
};

export async function getRevenueBreakdownByChannel(memberId: string): Promise<RevenueBreakdown> {
  const grouped = await prisma.gMVTransaction.groupBy({
    by: ["channel"],
    where: { memberId },
    _sum: { amount: true },
  });

  const amounts = new Map<RevenueChannel, number>();
  for (const c of [...NAMED_CHANNELS, "OTHER" as RevenueChannel]) amounts.set(c, 0);
  for (const g of grouped) amounts.set(g.channel, Number(g._sum.amount ?? 0));

  // Total spans ALL channels (including Other) so it always reconciles with
  // the hero's lifetime figure — the 6 named rows are a curated view, not
  // the sole source of truth for the total.
  const total = Array.from(amounts.values()).reduce((sum, v) => sum + v, 0);
  const otherAmount = amounts.get("OTHER") ?? 0;

  const channels = NAMED_CHANNELS.map((channel) => {
    const amount = amounts.get(channel) ?? 0;
    return { channel, label: CHANNEL_LABELS[channel], amount, percentOfTotal: total > 0 ? (amount / total) * 100 : 0 };
  }).sort((a, b) => b.amount - a.amount);

  return { channels, otherAmount, total };
}

export type MonthlyRevenuePoint = { month: string; monthly: number; cumulative: number };

export async function getMonthlyRevenueSeries(memberId: string, months = 12): Promise<MonthlyRevenuePoint[]> {
  const since = startOfMonth(subMonths(new Date(), months - 1));

  const [priorAgg, rows] = await Promise.all([
    prisma.gMVTransaction.aggregate({
      where: { memberId, transactionDate: { lt: since } },
      _sum: { amount: true },
    }),
    prisma.gMVTransaction.findMany({
      where: { memberId, transactionDate: { gte: since } },
      select: { amount: true, transactionDate: true },
    }),
  ]);

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = subMonths(new Date(), months - 1 - i);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const t of rows) {
    const key = `${t.transactionDate.getFullYear()}-${String(t.transactionDate.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + Number(t.amount));
  }

  let cumulative = Number(priorAgg._sum.amount ?? 0);
  return Array.from(buckets.entries()).map(([key, monthly]) => {
    cumulative += monthly;
    const [year, monthNum] = key.split("-").map(Number);
    return { month: format(new Date(year, monthNum - 1, 1), "MMM"), monthly, cumulative };
  });
}

export type TopRevenueSource = { id: string; label: string; channel: RevenueChannel; amount: number; date: Date };

export async function getTopRevenueSources(memberId: string, limit = 5): Promise<TopRevenueSource[]> {
  const rows = await prisma.gMVTransaction.findMany({
    where: { memberId },
    orderBy: { amount: "desc" },
    take: limit,
    select: { id: true, amount: true, description: true, source: true, channel: true, transactionDate: true },
  });

  return rows.map((r) => ({
    id: r.id,
    label: r.description?.trim() || r.source?.trim() || CHANNEL_LABELS[r.channel],
    channel: r.channel,
    amount: Number(r.amount),
    date: r.transactionDate,
  }));
}

export type RevenueGoalSummary = { annualGoalCents: number; yearTotal: number; progressPct: number };

// Progress is measured against the CURRENT CALENDAR YEAR's GMV, not
// lifetime — an "annual" goal compared to lifetime totals would already be
// exceeded on day one for anyone with prior history and never reset.
export async function getRevenueGoal(memberId: string): Promise<RevenueGoalSummary | null> {
  const goal = await prisma.revenueGoal.findUnique({ where: { memberId } });
  if (!goal) return null;

  const yearAgg = await prisma.gMVTransaction.aggregate({
    where: { memberId, transactionDate: { gte: startOfYear(new Date()) } },
    _sum: { amount: true },
  });
  const yearTotal = Number(yearAgg._sum.amount ?? 0);
  const goalDollars = goal.annualGoalCents / 100;

  return {
    annualGoalCents: goal.annualGoalCents,
    yearTotal,
    progressPct: goalDollars > 0 ? Math.min(100, (yearTotal / goalDollars) * 100) : 0,
  };
}
