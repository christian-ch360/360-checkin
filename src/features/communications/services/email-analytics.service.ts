import "server-only";

import { subDays, startOfDay, format } from "date-fns";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { EMAIL_CATEGORY_LABELS } from "@/features/communications/config/template-catalog";

export type EmailSentPerDayPoint = { date: string; sent: number; failed: number };

export async function getEmailsSentPerDay(organizationId: string, days = 30): Promise<EmailSentPerDayPoint[]> {
  const since = startOfDay(subDays(new Date(), days - 1));

  const logs = await prisma.emailLog.findMany({
    where: { organizationId, createdAt: { gte: since } },
    select: { createdAt: true, status: true },
  });

  const buckets = new Map<string, { sent: number; failed: number }>();
  for (let i = 0; i < days; i++) {
    const d = startOfDay(subDays(new Date(), days - 1 - i));
    buckets.set(format(d, "MMM d"), { sent: 0, failed: 0 });
  }
  for (const log of logs) {
    const key = format(startOfDay(log.createdAt), "MMM d");
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (log.status === "SENT" || log.status === "DELIVERED") bucket.sent++;
    else if (log.status === "FAILED" || log.status === "BOUNCED" || log.status === "COMPLAINED") bucket.failed++;
  }

  return Array.from(buckets.entries()).map(([date, counts]) => ({ date, ...counts }));
}

export type DeliveryRateTrendPoint = { date: string; deliveryRate: number; openRate: number; clickRate: number };

export async function getDeliveryOpenClickRateTrend(organizationId: string, days = 30): Promise<DeliveryRateTrendPoint[]> {
  const since = startOfDay(subDays(new Date(), days - 1));

  const logs = await prisma.emailLog.findMany({
    where: { organizationId, createdAt: { gte: since } },
    select: { createdAt: true, status: true, openedAt: true, clickedAt: true },
  });

  const buckets = new Map<string, { total: number; delivered: number; opened: number; clicked: number }>();
  for (let i = 0; i < days; i++) {
    const d = startOfDay(subDays(new Date(), days - 1 - i));
    buckets.set(format(d, "MMM d"), { total: 0, delivered: 0, opened: 0, clicked: 0 });
  }
  for (const log of logs) {
    const key = format(startOfDay(log.createdAt), "MMM d");
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total++;
    if (log.status === "SENT" || log.status === "DELIVERED") bucket.delivered++;
    if (log.openedAt) bucket.opened++;
    if (log.clickedAt) bucket.clicked++;
  }

  return Array.from(buckets.entries()).map(([date, b]) => ({
    date,
    deliveryRate: b.total > 0 ? Math.round((b.delivered / b.total) * 100) : 0,
    openRate: b.delivered > 0 ? Math.round((b.opened / b.delivered) * 100) : 0,
    clickRate: b.delivered > 0 ? Math.round((b.clicked / b.delivered) * 100) : 0,
  }));
}

export type TemplateUsagePoint = { template: string; count: number };

export async function getTemplateUsage(organizationId: string, limit = 8): Promise<TemplateUsagePoint[]> {
  const grouped = await prisma.emailLog.groupBy({
    by: ["template"],
    where: { organizationId },
    _count: { template: true },
    orderBy: { _count: { template: "desc" } },
    take: limit,
  });
  return grouped.map((g) => ({ template: g.template, count: g._count.template }));
}

export type CategoryBreakdownPoint = { category: string; count: number };

export async function getCategoryBreakdown(organizationId: string): Promise<CategoryBreakdownPoint[]> {
  const grouped = await prisma.emailLog.groupBy({
    by: ["category"],
    where: { organizationId },
    _count: { category: true },
    orderBy: { _count: { category: "desc" } },
  });
  return grouped.map((g) => ({ category: EMAIL_CATEGORY_LABELS[g.category], count: g._count.category }));
}

export type FailureRatePoint = { date: string; failureRate: number };

export async function getFailureRateTrend(organizationId: string, days = 30): Promise<FailureRatePoint[]> {
  const perDay = await getEmailsSentPerDay(organizationId, days);
  return perDay.map((p) => {
    const total = p.sent + p.failed;
    return { date: p.date, failureRate: total > 0 ? Math.round((p.failed / total) * 100) : 0 };
  });
}

export type EmailAnalyticsBundle = {
  sentPerDay: EmailSentPerDayPoint[];
  rateTrend: DeliveryRateTrendPoint[];
  templateUsage: TemplateUsagePoint[];
  categoryBreakdown: CategoryBreakdownPoint[];
  failureRate: FailureRatePoint[];
};

/** Analytics page load, cached 60s per organization (org id is part of the wrapped function's arguments, so it's automatically part of the cache key — same convention as analytics.service.ts's getCachedAnalyticsBundle). */
const getCachedEmailAnalyticsBundle = unstable_cache(
  async (organizationId: string): Promise<EmailAnalyticsBundle> => {
    const [sentPerDay, rateTrend, templateUsage, categoryBreakdown, failureRate] = await Promise.all([
      getEmailsSentPerDay(organizationId),
      getDeliveryOpenClickRateTrend(organizationId),
      getTemplateUsage(organizationId),
      getCategoryBreakdown(organizationId),
      getFailureRateTrend(organizationId),
    ]);
    return { sentPerDay, rateTrend, templateUsage, categoryBreakdown, failureRate };
  },
  ["email-analytics-bundle"],
  { revalidate: 60 }
);

export async function getCachedEmailAnalyticsData(organizationId: string): Promise<EmailAnalyticsBundle> {
  return getCachedEmailAnalyticsBundle(organizationId);
}
