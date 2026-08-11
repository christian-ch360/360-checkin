import "server-only";

import { prisma } from "@/lib/db/prisma";

const CAMPAIGN_INCLUDE = {
  brand: { select: { id: true, name: true, logoUrl: true } },
  createdBy: { select: { id: true, fullName: true } },
  creators: { include: { creator: { select: { id: true, fullName: true, profilePhotoUrl: true } } } },
  deliverables: true,
  _count: { select: { tasks: true, files: true, contracts: true, invoices: true } },
} as const;

export async function listCampaigns(organizationId: string, agencyId: string) {
  return prisma.campaign.findMany({
    where: { organizationId, agencyId },
    include: CAMPAIGN_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export type CampaignListItem = Awaited<ReturnType<typeof listCampaigns>>[number];

export async function getCampaign(organizationId: string, campaignId: string) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
    include: CAMPAIGN_INCLUDE,
  });
}

/** For a connected creator's own scoped view — only campaigns they're assigned to. */
export async function listCampaignsForCreator(organizationId: string, creatorMemberId: string) {
  return prisma.campaign.findMany({
    where: { organizationId, creators: { some: { creatorId: creatorMemberId } } },
    include: CAMPAIGN_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

/** For the Brand Contact portal — only campaigns for their one brand. */
export async function listCampaignsForBrand(organizationId: string, brandId: string) {
  return prisma.campaign.findMany({
    where: { organizationId, brandId },
    include: CAMPAIGN_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

/** For the Agency Dashboard's Campaigns status board. */
export async function getCampaignStatusCounts(organizationId: string, agencyId: string) {
  const rows = await prisma.campaign.groupBy({
    by: ["status"],
    where: { organizationId, agencyId },
    _count: { _all: true },
  });
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});
}

export async function getCampaignCreatorIds(campaignId: string): Promise<string[]> {
  const rows = await prisma.campaignCreator.findMany({ where: { campaignId }, select: { creatorId: true } });
  return rows.map((r) => r.creatorId);
}
