import "server-only";

import type { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type MembershipManagementFilters = {
  status?: SubscriptionStatus;
  search?: string;
};

/**
 * Membership Management only ever lists members who already have a
 * subscription row — that's every CREATOR approved after the billing
 * eligibility gate went in (see requiresMembership). Non-Creator members
 * never get a subscription, so there's nothing to manage for them here.
 */
export async function listMemberSubscriptions(organizationId: string, filters: MembershipManagementFilters = {}) {
  return prisma.memberSubscription.findMany({
    where: {
      member: {
        organizationId,
        ...(filters.search
          ? {
              OR: [
                { fullName: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
                { memberNumber: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      member: {
        select: { id: true, fullName: true, email: true, memberNumber: true, role: true, profilePhotoUrl: true },
      },
      plan: { select: { name: true, priceCents: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getMembershipStatusCounts(organizationId: string) {
  const rows = await prisma.memberSubscription.groupBy({
    by: ["status"],
    where: { member: { organizationId } },
    _count: true,
  });

  const counts: Record<SubscriptionStatus, number> = {
    TRIALING: 0,
    ACTIVE: 0,
    PAST_DUE: 0,
    CANCELED: 0,
    EXPIRED: 0,
  };
  for (const row of rows) counts[row.status] = row._count;
  return counts;
}
