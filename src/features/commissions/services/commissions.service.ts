import "server-only";

import type { CommissionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function listCommissionTiers(organizationId: string) {
  return prisma.commissionTier.findMany({
    where: { organizationId },
    orderBy: { code: "asc" },
  });
}

export async function listCommissionTransactions(
  organizationId: string,
  filters: { status?: CommissionStatus } = {},
  page = 1,
  pageSize = 25
) {
  const where = {
    member: { organizationId },
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.commissionTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
      include: {
        member: { select: { id: true, fullName: true, profilePhotoUrl: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.commissionTransaction.count({ where }),
  ]);

  return { transactions, total, page: Math.max(1, page), pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCommissionSummary(organizationId: string) {
  const [pending, approved, paid] = await Promise.all([
    prisma.commissionTransaction.aggregate({
      where: { member: { organizationId }, status: "PENDING" },
      _sum: { commissionAmount: true },
      _count: true,
    }),
    prisma.commissionTransaction.aggregate({
      where: { member: { organizationId }, status: "APPROVED" },
      _sum: { commissionAmount: true },
      _count: true,
    }),
    prisma.commissionTransaction.aggregate({
      where: { member: { organizationId }, status: "PAID" },
      _sum: { commissionAmount: true },
      _count: true,
    }),
  ]);

  return {
    pending: { amount: Number(pending._sum.commissionAmount ?? 0), count: pending._count },
    approved: { amount: Number(approved._sum.commissionAmount ?? 0), count: approved._count },
    paid: { amount: Number(paid._sum.commissionAmount ?? 0), count: paid._count },
  };
}

export async function getTopEarners(organizationId: string, take = 10) {
  const members = await prisma.member.findMany({
    where: { organizationId },
    orderBy: { lifetimeCommission: "desc" },
    take,
    select: { id: true, fullName: true, profilePhotoUrl: true, lifetimeCommission: true },
  });
  return members.map((m) => ({
    id: m.id,
    name: m.fullName,
    photoUrl: m.profilePhotoUrl,
    amount: Number(m.lifetimeCommission),
  }));
}
