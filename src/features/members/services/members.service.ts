import "server-only";

import type { MemberRole, MemberStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type MemberListFilters = {
  search?: string;
  role?: MemberRole;
  status?: MemberStatus;
  companyId?: string;
};

export type MemberListPage = {
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE_SIZE = 25;

function buildMemberWhere(organizationId: string, filters: MemberListFilters): Prisma.MemberWhereInput {
  return {
    organizationId,
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.companyId ? { companyId: filters.companyId } : {}),
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { memberNumber: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function listMembers(
  organizationId: string,
  filters: MemberListFilters = {},
  pagination: MemberListPage = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
) {
  const where = buildMemberWhere(organizationId, filters);
  const page = Math.max(1, pagination.page);
  const pageSize = pagination.pageSize;

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        company: { select: { id: true, name: true } },
        commissionTier: { select: { code: true, name: true, percentage: true } },
      },
    }),
    prisma.member.count({ where }),
  ]);

  return { members, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getMemberProfile(organizationId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId, deletedAt: null },
    include: {
      company: true,
      commissionTier: true,
      qrAsset: true,
      referredBy: { select: { id: true, fullName: true, referralCode: true } },
      projectAssignments: {
        include: { project: { select: { id: true, name: true, status: true, gmv: true } } },
        orderBy: { assignedAt: "desc" },
      },
      subscription: {
        include: { plan: true, payments: { orderBy: { paidAt: "desc" }, take: 20 } },
      },
      notesReceived: {
        include: { author: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!member) return null;

  const [checkIns, gmvTransactions, commissionTransactions] = await Promise.all([
    prisma.checkIn.findMany({
      where: { memberId },
      orderBy: { checkIn: "desc" },
      take: 30,
    }),
    prisma.gMVTransaction.findMany({
      where: { memberId },
      orderBy: { transactionDate: "desc" },
      take: 30,
      include: { project: { select: { name: true } } },
    }),
    prisma.commissionTransaction.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { project: { select: { name: true } } },
    }),
  ]);

  return { member, checkIns, gmvTransactions, commissionTransactions };
}

export async function listCompaniesForOrg(organizationId: string) {
  return prisma.company.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listCommissionTiersForOrg(organizationId: string) {
  return prisma.commissionTier.findMany({
    where: { organizationId },
    orderBy: { code: "asc" },
  });
}

/** Live counts for the Admin dashboard's Approval Queue Summary. */
export async function getMemberStatusCounts(organizationId: string) {
  const [pending, active, rejected] = await Promise.all([
    prisma.member.count({ where: { organizationId, status: "PENDING" } }),
    prisma.member.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.member.count({ where: { organizationId, status: "REJECTED" } }),
  ]);
  return { pending, active, rejected };
}

export type PendingMemberFilters = {
  search?: string;
  role?: MemberRole;
};

export async function listPendingMembers(
  organizationId: string,
  filters: PendingMemberFilters = {},
  pagination: MemberListPage = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
) {
  const where: Prisma.MemberWhereInput = {
    organizationId,
    status: "PENDING",
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { memberNumber: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const page = Math.max(1, pagination.page);
  const pageSize = pagination.pageSize;

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" }, // newest first
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.member.count({ where }),
  ]);

  return { members, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getApplicationDetail(organizationId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId },
    include: {
      company: { select: { id: true, name: true } },
      commissionTier: true,
      qrAsset: { select: { id: true } },
      approvedBy: { select: { id: true, fullName: true } },
      rejectedBy: { select: { id: true, fullName: true } },
      notesReceived: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, fullName: true } } },
      },
    },
  });
  if (!member) return null;

  return { member };
}
