import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { ContentCategory, SocialPlatform } from "@prisma/client";

/**
 * The genuinely public read path for "Our Work" — completely separate from
 * campaign-request.service.ts (private brand intake forms, admin-only).
 * Only ever returns `published = true` rows; there is no "preview
 * unpublished" mode on the public Creator Library.
 */
export type CampaignShowcaseSummary = {
  id: string;
  title: string;
  brandName: string;
  description: string | null;
  coverImage: string;
  galleryImages: string[];
  creatorCount: number | null;
  totalReach: number | null;
  locations: string[];
  categories: ContentCategory[];
  platforms: SocialPlatform[];
  objective: string | null;
  featured: boolean;
};

export async function listPublishedCampaignShowcases(organizationId: string): Promise<CampaignShowcaseSummary[]> {
  const rows = await prisma.campaignShowcase.findMany({
    where: { organizationId, published: true },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      brandName: true,
      description: true,
      coverImage: true,
      galleryImages: true,
      creatorCount: true,
      totalReach: true,
      locations: true,
      categories: true,
      platforms: true,
      objective: true,
      featured: true,
    },
  });
  return rows;
}
