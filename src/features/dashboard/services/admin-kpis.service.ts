import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getMemberStatusCounts } from "@/features/members/services/members.service";
import { getGMVSummary } from "@/features/gmv/services/gmv.service";
import { getCommissionSummary } from "@/features/commissions/services/commissions.service";

/**
 * Admin Dashboard's top-level KPI grid — org-wide, composed from existing
 * summary functions rather than re-querying from scratch wherever possible.
 */
export async function getAdminKpis(organizationId: string) {
  const [
    totalCreators,
    totalMembers,
    activeMemberships,
    statusCounts,
    totalBrands,
    followerTotal,
    connectedFollowerTotal,
    membershipRevenue,
    gmvSummary,
    commissionSummary,
  ] = await Promise.all([
    prisma.member.count({ where: { organizationId, role: "CREATOR", deletedAt: null } }),
    prisma.member.count({ where: { organizationId, deletedAt: null } }),
    prisma.memberSubscription.count({ where: { member: { organizationId }, status: { in: ["ACTIVE", "TRIALING"] } } }),
    getMemberStatusCounts(organizationId),
    prisma.brand.count({ where: { organizationId } }),
    prisma.member.aggregate({ where: { organizationId, deletedAt: null }, _sum: { followerCount: true } }),
    prisma.socialConnection.aggregate({
      where: { status: "CONNECTED", member: { organizationId } },
      _sum: { followerCount: true },
    }),
    prisma.membershipPayment.aggregate({
      where: { subscription: { member: { organizationId } } },
      _sum: { amountCents: true },
    }),
    getGMVSummary(organizationId),
    getCommissionSummary(organizationId),
  ]);

  return {
    members: {
      totalCreators,
      totalMembers,
      activeMemberships,
      pendingApplications: statusCounts.pending,
    },
    brands: {
      totalBrands,
    },
    social: {
      totalFollowers: followerTotal._sum.followerCount ?? 0,
      combinedSocialReach: connectedFollowerTotal._sum.followerCount ?? 0,
    },
    revenue: {
      membershipRevenueCents: membershipRevenue._sum.amountCents ?? 0,
      totalGMV: gmvSummary.allTimeTotal,
      totalCommissions: commissionSummary.pending.amount + commissionSummary.approved.amount + commissionSummary.paid.amount,
    },
  };
}
