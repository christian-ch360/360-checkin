import "server-only";

import { prisma } from "@/lib/db/prisma";

/** For the Agency Dashboard's Creators roster — full field set the CRM spec asks for. */
export async function listCreatorsForAgency(organizationId: string, agencyId: string) {
  return prisma.member.findMany({
    where: { organizationId, referredByMemberId: agencyId, role: "CREATOR", deletedAt: null },
    select: {
      id: true,
      fullName: true,
      profilePhotoUrl: true,
      platforms: true,
      followerCount: true,
      contentCategories: true,
      rateCard: true,
      availableForCollab: true,
      status: true,
      currentGMV: true,
      currentCommission: true,
      memberSince: true,
    },
    orderBy: { currentGMV: "desc" },
  });
}

export type AgencyCreatorRosterItem = Awaited<ReturnType<typeof listCreatorsForAgency>>[number];
