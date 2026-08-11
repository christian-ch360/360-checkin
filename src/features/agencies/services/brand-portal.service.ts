import "server-only";

import { prisma } from "@/lib/db/prisma";
import { listCampaignsForBrand } from "@/features/agencies/services/campaign.service";

/** Aggregate read-only view for the Brand Contact portal — everything scoped to their one brand. */
export async function getBrandPortalOverview(organizationId: string, brandId: string) {
  const [brand, campaigns, contracts, invoices] = await Promise.all([
    prisma.brand.findFirst({ where: { id: brandId, organizationId } }),
    listCampaignsForBrand(organizationId, brandId),
    prisma.contract.findMany({
      where: { organizationId, brandId },
      include: { campaign: { select: { id: true, title: true } }, versions: { orderBy: { versionNumber: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { organizationId, brandId },
      include: { campaign: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { brand, campaigns, contracts, invoices };
}

export type BrandPortalOverview = Awaited<ReturnType<typeof getBrandPortalOverview>>;
