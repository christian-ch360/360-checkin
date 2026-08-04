import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { startOfDay, startOfMonth, startOfYear, subDays } from "date-fns";

export async function getOccupancy(organizationId: string) {
  const openCheckIns = await prisma.checkIn.count({
    where: {
      status: "CHECKED_IN",
      member: { organizationId },
    },
  });
  return openCheckIns;
}

export async function getTodayStats(organizationId: string) {
  const start = startOfDay(new Date());

  const [checkIns, durationAgg, gmvAgg] = await Promise.all([
    prisma.checkIn.count({
      where: { checkIn: { gte: start }, member: { organizationId } },
    }),
    prisma.checkIn.aggregate({
      where: {
        checkIn: { gte: start },
        member: { organizationId },
        duration: { not: null },
      },
      _sum: { duration: true },
    }),
    prisma.gMVTransaction.aggregate({
      where: { transactionDate: { gte: start }, member: { organizationId } },
      _sum: { amount: true },
    }),
  ]);

  return {
    checkIns,
    hours: Number(durationAgg._sum.duration ?? 0) / 60,
    gmv: Number(gmvAgg._sum.amount ?? 0),
  };
}

export async function getMonthlyGMVSeries(organizationId: string, months = 6) {
  const since = startOfMonth(subDays(new Date(), months * 30));

  const transactions = await prisma.gMVTransaction.findMany({
    where: { transactionDate: { gte: since }, member: { organizationId } },
    select: { amount: true, transactionDate: true },
  });

  const buckets = new Map<string, number>();
  for (const t of transactions) {
    const key = `${t.transactionDate.getFullYear()}-${String(t.transactionDate.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + Number(t.amount));
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, gmv]) => ({ month, gmv }));
}

export async function getTopPerformers(organizationId: string) {
  const [topCreators, topBrands, topProjects] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId, role: "CREATOR" },
      orderBy: { currentGMV: "desc" },
      take: 5,
      select: { id: true, fullName: true, currentGMV: true, profilePhotoUrl: true },
    }),
    prisma.brand.findMany({
      where: { organizationId },
      include: {
        _count: { select: { gmvTransactions: true } },
        gmvTransactions: { select: { amount: true } },
      },
      take: 20,
    }),
    prisma.project.findMany({
      where: { organizationId },
      orderBy: { gmv: "desc" },
      take: 5,
      select: { id: true, name: true, gmv: true, status: true },
    }),
  ]);

  const topBrandsRanked = topBrands
    .map((b) => ({
      id: b.id,
      name: b.name,
      gmv: b.gmvTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 5);

  return {
    topCreators: topCreators.map((c) => ({
      id: c.id,
      name: c.fullName,
      gmv: Number(c.currentGMV),
      photoUrl: c.profilePhotoUrl,
    })),
    topBrands: topBrandsRanked,
    topProjects: topProjects.map((p) => ({
      id: p.id,
      name: p.name,
      gmv: Number(p.gmv),
      status: p.status,
    })),
  };
}

export async function getRecentActivity(organizationId: string, take = 10) {
  const logs = await prisma.activityLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    include: { member: { select: { fullName: true, profilePhotoUrl: true } } },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    memberName: log.member?.fullName ?? "System",
    createdAt: log.createdAt,
    metadata: log.metadata,
  }));
}

export async function getYearlyGMVTotal(organizationId: string) {
  const start = startOfYear(new Date());
  const agg = await prisma.gMVTransaction.aggregate({
    where: { transactionDate: { gte: start }, member: { organizationId } },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

export async function getTodayBookingsCount(organizationId: string) {
  const start = startOfDay(new Date());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return prisma.reservation.count({
    where: {
      status: "CONFIRMED",
      startTime: { gte: start, lt: end },
      space: { organizationId },
    },
  });
}

export async function getActiveCommissionTierCount(organizationId: string) {
  return prisma.commissionTier.count({ where: { organizationId } });
}

/**
 * Dashboard page load, cached for 30s per organization. unstable_cache
 * round-trips its return value through JSON.stringify/parse (verified
 * directly against Next's source — there's no special Date handling), so
 * getRecentActivity's `createdAt` Date objects come back as plain ISO
 * strings on a cache hit. They're re-hydrated into real Dates below so
 * every caller sees the same shape regardless of hit/miss.
 */
const getCachedDashboardBundle = unstable_cache(
  async (organizationId: string) => {
    const [occupancy, todayStats, gmvSeries, topPerformers, activity, yearlyGMV, todayBookings, activeCommissionTiers] =
      await Promise.all([
        getOccupancy(organizationId),
        getTodayStats(organizationId),
        getMonthlyGMVSeries(organizationId),
        getTopPerformers(organizationId),
        getRecentActivity(organizationId),
        getYearlyGMVTotal(organizationId),
        getTodayBookingsCount(organizationId),
        getActiveCommissionTierCount(organizationId),
      ]);
    return { occupancy, todayStats, gmvSeries, topPerformers, activity, yearlyGMV, todayBookings, activeCommissionTiers };
  },
  ["dashboard-bundle"],
  { revalidate: 30 }
);

export async function getCachedDashboardData(organizationId: string) {
  const data = await getCachedDashboardBundle(organizationId);
  return {
    ...data,
    activity: data.activity.map((item) => ({ ...item, createdAt: new Date(item.createdAt) })),
  };
}
