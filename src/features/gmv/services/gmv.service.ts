import "server-only";

import { startOfMonth, startOfYear, subMonths } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import type { MemberRole } from "@prisma/client";

export async function listGMVTransactions(organizationId: string, page = 1, pageSize = 25) {
  const where = { member: { organizationId } };
  const [transactions, total] = await Promise.all([
    prisma.gMVTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
      include: {
        member: { select: { id: true, fullName: true, role: true, profilePhotoUrl: true } },
        project: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    }),
    prisma.gMVTransaction.count({ where }),
  ]);

  return { transactions, total, page: Math.max(1, page), pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getGMVSummary(organizationId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const [monthAgg, yearAgg, allTimeAgg, lastMonthAgg] = await Promise.all([
    prisma.gMVTransaction.aggregate({
      where: { transactionDate: { gte: monthStart }, member: { organizationId } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.gMVTransaction.aggregate({
      where: { transactionDate: { gte: yearStart }, member: { organizationId } },
      _sum: { amount: true },
    }),
    prisma.gMVTransaction.aggregate({
      where: { member: { organizationId } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.gMVTransaction.aggregate({
      where: {
        transactionDate: { gte: startOfMonth(subMonths(now, 1)), lt: monthStart },
        member: { organizationId },
      },
      _sum: { amount: true },
    }),
  ]);

  const monthTotal = Number(monthAgg._sum.amount ?? 0);
  const lastMonthTotal = Number(lastMonthAgg._sum.amount ?? 0);
  const growthPct = lastMonthTotal === 0 ? null : ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100;

  return {
    monthTotal,
    monthCount: monthAgg._count,
    yearTotal: Number(yearAgg._sum.amount ?? 0),
    allTimeTotal: Number(allTimeAgg._sum.amount ?? 0),
    allTimeCount: allTimeAgg._count,
    growthPct,
  };
}

export async function getGMVHistoricalSeries(organizationId: string, months = 12) {
  const since = startOfMonth(subMonths(new Date(), months - 1));

  const transactions = await prisma.gMVTransaction.findMany({
    where: { transactionDate: { gte: since }, member: { organizationId } },
    select: { amount: true, transactionDate: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = subMonths(new Date(), months - 1 - i);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const t of transactions) {
    const key = `${t.transactionDate.getFullYear()}-${String(t.transactionDate.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + Number(t.amount));
  }

  return Array.from(buckets.entries()).map(([month, gmv]) => ({ month, gmv }));
}

async function leaderboardByRole(organizationId: string, role: MemberRole, take = 10) {
  const members = await prisma.member.findMany({
    where: { organizationId, role },
    orderBy: { currentGMV: "desc" },
    take,
    select: { id: true, fullName: true, currentGMV: true, profilePhotoUrl: true },
  });
  return members.map((m) => ({ id: m.id, name: m.fullName, gmv: Number(m.currentGMV), photoUrl: m.profilePhotoUrl }));
}

export async function getLeaderboards(organizationId: string) {
  const [creators, agencies, brokers, brands, projects, companies] = await Promise.all([
    leaderboardByRole(organizationId, "CREATOR"),
    leaderboardByRole(organizationId, "AGENCY"),
    leaderboardByRole(organizationId, "BROKER"),
    prisma.brand.findMany({
      where: { organizationId },
      include: { gmvTransactions: { select: { amount: true } } },
    }),
    prisma.project.findMany({
      where: { organizationId },
      orderBy: { gmv: "desc" },
      take: 10,
      select: { id: true, name: true, gmv: true },
    }),
    prisma.company.findMany({
      where: { organizationId },
      include: { gmvTransactions: { select: { amount: true } } },
    }),
  ]);

  const brandLeaderboard = brands
    .map((b) => ({
      id: b.id,
      name: b.name,
      gmv: b.gmvTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 10);

  const companyLeaderboard = companies
    .map((c) => ({
      id: c.id,
      name: c.name,
      gmv: c.gmvTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 10);

  return {
    creators,
    agencies,
    brokers,
    brands: brandLeaderboard,
    companies: companyLeaderboard,
    projects: projects.map((p) => ({ id: p.id, name: p.name, gmv: Number(p.gmv) })),
  };
}
