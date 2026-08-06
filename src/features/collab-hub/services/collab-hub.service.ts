import "server-only";

import type { MemberRole, ContentCategory, SocialPlatform, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getSocialDirectoryAggregates } from "@/features/integrations/services/social-directory.service";
import type { SocialSummaryEntry } from "@/features/integrations/services/social-connections.service";
import { contentCategoryValues, CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";

export type CollabSortKey =
  | "largestAudience"
  | "highestInstagram"
  | "highestTikTok"
  | "highestYoutube"
  | "fastestGrowth"
  | "recentlyJoined"
  | "alphabetical"
  | "recentlySynced";

export type CollabFilters = {
  search?: string;
  role?: MemberRole;
  availableOnly?: boolean;
  skill?: string;
  category?: ContentCategory;
  platforms?: SocialPlatform[];
  minFollowers?: number;
  verifiedOnly?: boolean;
  recentlySyncedOnly?: boolean;
  location?: string;
  sort?: CollabSortKey;
};

// "Recently synced" reuses the same freshness window the daily cron targets
// (syncs run every 24h) plus headroom for the sweep to actually finish.
const RECENTLY_SYNCED_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function listCollabMembers(organizationId: string, filters: CollabFilters = {}) {
  // "gaming"/"beauty"/"fitness" etc. should also surface creators tagged
  // with that content category, not just members whose bio literally
  // contains the word.
  const matchedCategories = filters.search
    ? contentCategoryValues.filter((c) => CONTENT_CATEGORY_LABELS[c].toLowerCase().includes(filters.search!.toLowerCase()))
    : [];

  const where: Prisma.MemberWhereInput = {
    organizationId,
    status: "ACTIVE",
    visibleInDirectory: true,
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.availableOnly ? { availableForCollab: true } : {}),
    ...(filters.skill ? { skills: { has: filters.skill } } : {}),
    ...(filters.category ? { contentCategories: { has: filters.category } } : {}),
    ...(filters.location ? { location: { contains: filters.location, mode: "insensitive" } } : {}),
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: "insensitive" } },
            { bio: { contains: filters.search, mode: "insensitive" } },
            { socialConnections: { some: { externalUsername: { contains: filters.search, mode: "insensitive" } } } },
            ...(matchedCategories.length > 0 ? [{ contentCategories: { hasSome: matchedCategories } }] : []),
          ],
        }
      : {}),
  };

  const members = await prisma.member.findMany({
    where,
    orderBy: [{ availableForCollab: "desc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      role: true,
      profilePhotoUrl: true,
      bio: true,
      skills: true,
      availableForCollab: true,
      memberSince: true,
      company: { select: { name: true } },
    },
  });

  // One org-wide, cached aggregate query — never per-row. Also directly
  // reused for each card's follower badges below, so the directory never
  // issues a second social-data query for the same page load.
  const social = await getSocialDirectoryAggregates(organizationId);

  let filtered = members;

  if (filters.platforms && filters.platforms.length > 0) {
    filtered = filtered.filter((m) => {
      const connected = social[m.id]?.connectedPlatforms ?? [];
      return filters.platforms!.every((p) => connected.includes(p));
    });
  }
  if (filters.minFollowers != null) {
    filtered = filtered.filter((m) => (social[m.id]?.totalFollowers ?? 0) >= filters.minFollowers!);
  }
  if (filters.verifiedOnly) {
    filtered = filtered.filter((m) => (social[m.id]?.verifiedPlatformCount ?? 0) > 0);
  }
  if (filters.recentlySyncedOnly) {
    const cutoff = Date.now() - RECENTLY_SYNCED_WINDOW_MS;
    filtered = filtered.filter((m) => {
      const t = social[m.id]?.lastSyncedAt;
      return t != null && t.getTime() >= cutoff;
    });
  }

  if (filters.sort) {
    const entryFor = (id: string) => social[id];
    const sorted = [...filtered];
    switch (filters.sort) {
      case "largestAudience":
        sorted.sort((a, b) => (entryFor(b.id)?.totalFollowers ?? 0) - (entryFor(a.id)?.totalFollowers ?? 0));
        break;
      case "highestInstagram":
        sorted.sort(
          (a, b) => (entryFor(b.id)?.platformFollowers.INSTAGRAM ?? 0) - (entryFor(a.id)?.platformFollowers.INSTAGRAM ?? 0)
        );
        break;
      case "highestTikTok":
        sorted.sort((a, b) => (entryFor(b.id)?.platformFollowers.TIKTOK ?? 0) - (entryFor(a.id)?.platformFollowers.TIKTOK ?? 0));
        break;
      case "highestYoutube":
        sorted.sort(
          (a, b) => (entryFor(b.id)?.platformFollowers.YOUTUBE ?? 0) - (entryFor(a.id)?.platformFollowers.YOUTUBE ?? 0)
        );
        break;
      case "fastestGrowth":
        sorted.sort((a, b) => (entryFor(b.id)?.monthlyGrowth ?? -Infinity) - (entryFor(a.id)?.monthlyGrowth ?? -Infinity));
        break;
      case "recentlyJoined":
        sorted.sort((a, b) => b.memberSince.getTime() - a.memberSince.getTime());
        break;
      case "alphabetical":
        sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
        break;
      case "recentlySynced":
        sorted.sort((a, b) => (entryFor(b.id)?.lastSyncedAt?.getTime() ?? 0) - (entryFor(a.id)?.lastSyncedAt?.getTime() ?? 0));
        break;
    }
    filtered = sorted;
  }

  return filtered.map((m) => {
    const entry = social[m.id];
    const socialSummary: SocialSummaryEntry[] = entry
      ? entry.connectedPlatforms.map((platform) => ({
          platform,
          followerCount: entry.platformFollowers[platform] ?? 0,
          verified: entry.verifiedPlatforms.includes(platform),
        }))
      : [];
    return {
      ...m,
      socialSummary,
      totalFollowers: entry?.totalFollowers ?? 0,
      monthlyGrowth: entry?.monthlyGrowth ?? null,
      lastSocialSyncAt: entry?.lastSyncedAt ?? null,
    };
  });
}

export async function listAllSkills(organizationId: string) {
  const members = await prisma.member.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { skills: true },
  });
  const set = new Set<string>();
  for (const m of members) for (const s of m.skills) set.add(s);
  return Array.from(set).sort();
}
