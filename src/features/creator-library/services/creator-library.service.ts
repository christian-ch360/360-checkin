import "server-only";

import type { ContentCategory, SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import {
  resolveAudienceBreakdown,
  type AudienceBreakdown,
  type SyncedFollowerCounts,
} from "@/features/creator-library/lib/audience";
import { formatLocationLabel } from "@/features/creator-library/lib/location";
import { resolveCoordinates, type LatLng } from "@/features/creator-library/lib/geocode";
import { resolveReachTier, type ReachTier, REACH_TIERS } from "@/features/creator-library/lib/reach";
import {
  DEFAULT_LIBRARY_SORT,
  LIBRARY_PAGE_SIZE,
  PLATFORM_LABELS,
  resolveFollowerBucket,
  type LibrarySortKey,
} from "@/features/creator-library/config/library-config";

/**
 * Read layer for the public Creator Library. Scopes to `visible = true`; a
 * profile is either LINKED to an ACTIVE `role = CREATOR` Member (identity from
 * the Member, override columns win) or STANDALONE (`memberId` null, identity on
 * the profile — CSV-imported directory entries). That scoping IS the
 * authorization boundary for this password-gated surface.
 *
 * The visible set per org is bounded (hundreds/low-thousands), so the list
 * query fetches candidate rows once and does audience computation, text
 * search, filtering and sorting in memory. Audience totals and reach tiers are
 * computed, never stored.
 *
 * The public URL/param for a creator is the CreatorLibraryProfile id (works
 * for linked and standalone alike).
 */

const MEMBER_SELECT = {
  id: true,
  fullName: true,
  displayName: true,
  username: true,
  profilePhotoUrl: true,
  location: true,
  bio: true,
  contentCategories: true,
  instagramUrl: true,
  tiktokUrl: true,
  youtubeUrl: true,
  website: true,
  verificationStatus: true,
  memberSince: true,
  company: { select: { name: true } },
} as const;

const PROFILE_SELECT = {
  id: true,
  memberId: true,
  featured: true,
  displayOrder: true,
  headline: true,
  libraryBio: true,
  locationLabel: true,
  categories: true,
  imageUrl: true,
  name: true,
  email: true,
  usernameHandle: true,
  instagramUrl: true,
  tiktokUrl: true,
  youtubeUrl: true,
  websiteUrl: true,
  companyName: true,
  country: true,
  state: true,
  city: true,
  instagramFollowers: true,
  tiktokFollowers: true,
  youtubeSubscribers: true,
  publishedAt: true,
  createdAt: true,
  member: { select: MEMBER_SELECT },
} as const;

export type LibraryCreatorCard = {
  id: string;
  name: string;
  username: string | null;
  location: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  imageUrl: string | null;
  headline: string | null;
  categories: ContentCategory[];
  audience: AudienceBreakdown;
  reachTier: ReachTier | null;
  platforms: SocialPlatform[];
  featured: boolean;
  displayOrder: number | null;
  standalone: boolean;
  c360Verified: boolean;
  createdAt: Date;
  publishedAt: Date | null;
};

export type LibraryCreatorDetail = LibraryCreatorCard & {
  bio: string | null;
  companyName: string | null;
  memberSince: Date | null;
  links: { instagram: string | null; tiktok: string | null; youtube: string | null; website: string | null };
};

export type LibraryFilters = {
  search?: string;
  platform?: SocialPlatform;
  followerBucket?: string;
  category?: ContentCategory;
  country?: string;
  state?: string;
  city?: string;
  reach?: string;
  featuredOnly?: boolean;
  sort?: LibrarySortKey;
  page?: number;
};

export type LibraryListResult = {
  items: LibraryCreatorCard[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: number;
};

type LibraryRow = Awaited<ReturnType<typeof loadVisibleRows>>[number];

export async function getPrimaryOrganizationId(): Promise<string | null> {
  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return organization?.id ?? null;
}

async function loadVisibleRows(organizationId: string) {
  return prisma.creatorLibraryProfile.findMany({
    where: {
      organizationId,
      visible: true,
      OR: [{ memberId: null }, { member: { role: "CREATOR", status: "ACTIVE", deletedAt: null } }],
    },
    select: PROFILE_SELECT,
  });
}

async function loadSyncedFollowers(memberIds: string[]): Promise<Record<string, SyncedFollowerCounts>> {
  const ids = memberIds.filter(Boolean);
  if (ids.length === 0) return {};
  const connections = await prisma.socialConnection.findMany({
    where: { memberId: { in: ids }, followerCount: { not: null } },
    select: { memberId: true, platform: true, followerCount: true },
  });
  const byMember: Record<string, SyncedFollowerCounts> = {};
  for (const connection of connections) {
    if (connection.followerCount == null) continue;
    (byMember[connection.memberId] ??= {})[connection.platform] = connection.followerCount;
  }
  return byMember;
}

function effectiveCategories(row: LibraryRow): ContentCategory[] {
  return row.categories.length > 0 ? row.categories : (row.member?.contentCategories ?? []);
}

function locationParts(row: LibraryRow) {
  const country = row.country?.trim() || null;
  const state = row.state?.trim() || null;
  const city = row.city?.trim() || null;
  return { country, state, city };
}

function effectiveLocation(row: LibraryRow): string | null {
  const structured = formatLocationLabel(locationParts(row));
  return structured ?? row.locationLabel?.trim() ?? row.member?.location?.trim() ?? null;
}

function displayName(row: LibraryRow): string {
  return (
    (row.member?.displayName ?? row.member?.fullName ?? row.name)?.trim() || "Unnamed creator"
  );
}

function username(row: LibraryRow): string | null {
  return row.member?.username ?? row.usernameHandle ?? null;
}

function socialLinks(row: LibraryRow) {
  return {
    instagram: (row.instagramUrl ?? row.member?.instagramUrl)?.trim() || null,
    tiktok: (row.tiktokUrl ?? row.member?.tiktokUrl)?.trim() || null,
    youtube: (row.youtubeUrl ?? row.member?.youtubeUrl)?.trim() || null,
    website: (row.websiteUrl ?? row.member?.website)?.trim() || null,
  };
}

function activePlatforms(row: LibraryRow, audience: AudienceBreakdown): SocialPlatform[] {
  const set = new Set<SocialPlatform>(audience.platforms.map((entry) => entry.platform));
  const links = socialLinks(row);
  if (links.instagram) set.add("INSTAGRAM");
  if (links.tiktok) set.add("TIKTOK");
  if (links.youtube) set.add("YOUTUBE");
  return (["INSTAGRAM", "TIKTOK", "YOUTUBE"] as SocialPlatform[]).filter((platform) => set.has(platform));
}

function audienceFor(row: LibraryRow, synced: Record<string, SyncedFollowerCounts>): AudienceBreakdown {
  return resolveAudienceBreakdown(
    {
      instagramFollowers: row.instagramFollowers,
      tiktokFollowers: row.tiktokFollowers,
      youtubeSubscribers: row.youtubeSubscribers,
    },
    (row.memberId ? synced[row.memberId] : undefined) ?? {},
  );
}

function toCard(row: LibraryRow, audience: AudienceBreakdown): LibraryCreatorCard {
  const parts = locationParts(row);
  return {
    id: row.id,
    name: displayName(row),
    username: username(row),
    location: effectiveLocation(row),
    country: parts.country,
    state: parts.state,
    city: parts.city,
    imageUrl: row.imageUrl ?? row.member?.profilePhotoUrl ?? null,
    headline: row.headline?.trim() || null,
    categories: effectiveCategories(row),
    audience,
    reachTier: resolveReachTier(audience.total),
    platforms: activePlatforms(row, audience),
    featured: row.featured,
    displayOrder: row.displayOrder,
    standalone: row.memberId == null,
    c360Verified: row.member?.verificationStatus === "VERIFIED",
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
  };
}

function matchesSearch(row: LibraryRow, query: string, audience: AudienceBreakdown): boolean {
  const parts = locationParts(row);
  const haystack = [
    displayName(row),
    row.member?.fullName,
    username(row),
    row.headline,
    row.libraryBio ?? row.member?.bio,
    parts.city,
    parts.state,
    parts.country,
    row.member?.company?.name ?? row.companyName,
    row.instagramUrl ?? row.member?.instagramUrl,
    row.tiktokUrl ?? row.member?.tiktokUrl,
    row.youtubeUrl ?? row.member?.youtubeUrl,
    ...effectiveCategories(row).map((category) => CONTENT_CATEGORY_LABELS[category]),
    ...activePlatforms(row, audience).map((platform) => PLATFORM_LABELS[platform]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function sortCards(a: LibraryCreatorCard, b: LibraryCreatorCard, sort: LibrarySortKey): number {
  switch (sort) {
    case "followers_desc":
      return b.audience.total - a.audience.total;
    case "followers_asc":
      return a.audience.total - b.audience.total;
    case "newest":
      return b.createdAt.getTime() - a.createdAt.getTime();
    case "alphabetical":
      return a.name.localeCompare(b.name);
    case "recently_added":
      return (b.publishedAt?.getTime() ?? b.createdAt.getTime()) - (a.publishedAt?.getTime() ?? a.createdAt.getTime());
    case "featured": {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return b.audience.total - a.audience.total;
    }
    case "relevance":
    default:
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (b.audience.total !== a.audience.total) return b.audience.total - a.audience.total;
      return a.name.localeCompare(b.name);
  }
}

function ci(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export async function listLibraryCreators(
  organizationId: string,
  filters: LibraryFilters = {},
): Promise<LibraryListResult> {
  const rows = await loadVisibleRows(organizationId);
  const synced = await loadSyncedFollowers(rows.map((row) => row.memberId).filter((id): id is string => Boolean(id)));

  const bucket = resolveFollowerBucket(filters.followerBucket);
  const search = filters.search?.trim();
  const sort = filters.sort ?? DEFAULT_LIBRARY_SORT;
  const page = Math.max(1, filters.page ?? 1);
  const country = ci(filters.country);
  const state = ci(filters.state);
  const city = ci(filters.city);

  let cards = rows.map((row) => ({ row, audience: audienceFor(row, synced) }));

  if (filters.featuredOnly) cards = cards.filter(({ row }) => row.featured);
  if (filters.category) {
    cards = cards.filter(({ row }) => effectiveCategories(row).includes(filters.category as ContentCategory));
  }
  if (filters.platform) {
    cards = cards.filter(({ row, audience }) => activePlatforms(row, audience).includes(filters.platform as SocialPlatform));
  }
  if (bucket) {
    cards = cards.filter(({ audience }) => {
      if (audience.isEmpty) return false;
      return audience.total >= bucket.min && (bucket.max == null || audience.total < bucket.max);
    });
  }
  if (country) cards = cards.filter(({ row }) => ci(locationParts(row).country) === country);
  if (state) cards = cards.filter(({ row }) => ci(locationParts(row).state) === state);
  if (city) cards = cards.filter(({ row }) => ci(locationParts(row).city) === city);
  if (filters.reach) {
    cards = cards.filter(({ audience }) => resolveReachTier(audience.total)?.key === filters.reach);
  }
  if (search) cards = cards.filter(({ row, audience }) => matchesSearch(row, search, audience));

  const mapped = cards.map(({ row, audience }) => toCard(row, audience));
  mapped.sort((a, b) => sortCards(a, b, sort));

  const total = mapped.length;
  const items = mapped.slice(0, page * LIBRARY_PAGE_SIZE);
  return { items, total, page, pageSize: LIBRARY_PAGE_SIZE, hasMore: Math.max(0, total - items.length) };
}

export async function getLibraryCreator(
  organizationId: string,
  profileId: string,
): Promise<LibraryCreatorDetail | null> {
  const row = await prisma.creatorLibraryProfile.findFirst({
    where: {
      id: profileId,
      organizationId,
      visible: true,
      OR: [{ memberId: null }, { member: { role: "CREATOR", status: "ACTIVE", deletedAt: null } }],
    },
    select: PROFILE_SELECT,
  });
  if (!row) return null;

  const synced = row.memberId ? await loadSyncedFollowers([row.memberId]) : {};
  const audience = audienceFor(row, synced);
  const card = toCard(row, audience);

  return {
    ...card,
    bio: (row.libraryBio ?? row.member?.bio)?.trim() || null,
    companyName: row.member?.company?.name ?? row.companyName ?? null,
    memberSince: row.member?.memberSince ?? null,
    links: socialLinks(row),
  };
}

export type LibraryStats = {
  creators: number;
  combinedFollowers: number;
  cities: number;
  countries: number;
};

export async function getLibraryStats(organizationId: string): Promise<LibraryStats> {
  const rows = await loadVisibleRows(organizationId);
  const synced = await loadSyncedFollowers(rows.map((row) => row.memberId).filter((id): id is string => Boolean(id)));

  let combinedFollowers = 0;
  const cities = new Set<string>();
  const countries = new Set<string>();
  for (const row of rows) {
    combinedFollowers += audienceFor(row, synced).total;
    const parts = locationParts(row);
    if (parts.city) cities.add(`${ci(parts.city)}|${ci(parts.state)}`);
    if (parts.country) countries.add(ci(parts.country));
  }
  return { creators: rows.length, combinedFollowers, cities: cities.size, countries: countries.size };
}

export type LibraryCategoryCount = { category: ContentCategory; label: string; count: number };

export async function listLibraryCategories(organizationId: string): Promise<LibraryCategoryCount[]> {
  const rows = await loadVisibleRows(organizationId);
  const counts = new Map<ContentCategory, number>();
  for (const row of rows) {
    for (const category of effectiveCategories(row)) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, label: CONTENT_CATEGORY_LABELS[category], count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export type LibraryLocationTree = {
  country: string;
  count: number;
  states: { state: string; count: number; cities: { city: string; count: number }[] }[];
}[];

export async function listLibraryLocations(organizationId: string): Promise<LibraryLocationTree> {
  const rows = await loadVisibleRows(organizationId);
  const countries = new Map<string, Map<string, Map<string, number>>>();

  for (const row of rows) {
    const { country, state, city } = locationParts(row);
    if (!country) continue;
    const states = countries.get(country) ?? new Map();
    countries.set(country, states);
    const stateKey = state ?? "—";
    const cityMap = states.get(stateKey) ?? new Map();
    states.set(stateKey, cityMap);
    const cityKey = city ?? "—";
    cityMap.set(cityKey, (cityMap.get(cityKey) ?? 0) + 1);
  }

  return [...countries.entries()]
    .map(([country, states]) => {
      const stateList = [...states.entries()]
        .map(([state, cities]) => {
          const cityList = [...cities.entries()]
            .map(([city, count]) => ({ city, count }))
            .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
          return { state, count: cityList.reduce((s, c) => s + c.count, 0), cities: cityList };
        })
        .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));
      return { country, count: stateList.reduce((s, st) => s + st.count, 0), states: stateList };
    })
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
}

export type LibraryLocationSummary = {
  country: string;
  state: string | null;
  city: string | null;
  /** Display name for this bucket — the finest real detail available. */
  label: string;
  count: number;
  coords: LatLng | null;
  creators: { id: string; name: string; imageUrl: string | null }[];
};

export type LibraryLocationOverview = {
  totalCreators: number;
  countries: number;
  states: number;
  cities: number;
  summaries: LibraryLocationSummary[];
  tree: LibraryLocationTree;
};

/**
 * The Locations map/explorer's data — one summary per real city (or per
 * state/country when creators haven't specified finer detail), each with a
 * geocoded marker position and a real creator sample for its avatar stack.
 * Built entirely from `listLibraryLocations` + `listLibraryCreators` — no
 * duplicated row-loading logic.
 */
export async function getLibraryLocationOverview(organizationId: string): Promise<LibraryLocationOverview> {
  const tree = await listLibraryLocations(organizationId);

  const buckets: { country: string; state: string | null; city: string | null; count: number }[] = [];
  let stateCount = 0;

  for (const country of tree) {
    if (country.states.length === 0) {
      buckets.push({ country: country.country, state: null, city: null, count: country.count });
      continue;
    }
    for (const state of country.states) {
      const hasState = state.state !== "—";
      if (hasState) stateCount++;
      const realCities = state.cities.filter((entry) => entry.city !== "—");
      if (realCities.length === 0) {
        buckets.push({
          country: country.country,
          state: hasState ? state.state : null,
          city: null,
          count: state.count,
        });
        continue;
      }
      for (const entry of realCities) {
        buckets.push({
          country: country.country,
          state: hasState ? state.state : null,
          city: entry.city,
          count: entry.count,
        });
      }
    }
  }

  const summaries = await Promise.all(
    buckets.map(async (bucket): Promise<LibraryLocationSummary> => {
      const result = await listLibraryCreators(organizationId, {
        country: bucket.country,
        state: bucket.state ?? undefined,
        city: bucket.city ?? undefined,
        sort: "followers_desc",
      });
      return {
        country: bucket.country,
        state: bucket.state,
        city: bucket.city,
        label: bucket.city ?? bucket.state ?? bucket.country,
        count: bucket.count,
        coords: resolveCoordinates(bucket.country, bucket.state, bucket.city),
        creators: result.items.slice(0, 4).map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })),
      };
    }),
  );

  summaries.sort((a, b) => b.count - a.count);

  return {
    totalCreators: tree.reduce((sum, country) => sum + country.count, 0),
    countries: tree.length,
    states: stateCount,
    cities: summaries.filter((summary) => summary.city).length,
    summaries,
    tree,
  };
}

export type LibraryReachCount = { tier: ReachTier; count: number };

export async function listLibraryReachTiers(organizationId: string): Promise<LibraryReachCount[]> {
  const rows = await loadVisibleRows(organizationId);
  const synced = await loadSyncedFollowers(rows.map((row) => row.memberId).filter((id): id is string => Boolean(id)));
  const counts = new Map<string, number>();
  for (const row of rows) {
    const tier = resolveReachTier(audienceFor(row, synced).total);
    if (tier) counts.set(tier.key, (counts.get(tier.key) ?? 0) + 1);
  }
  // Highest tier first for the view.
  return [...REACH_TIERS].reverse().map((tier) => ({ tier, count: counts.get(tier.key) ?? 0 }));
}

export async function listFeaturedCreators(organizationId: string, limit = 6): Promise<LibraryCreatorCard[]> {
  const result = await listLibraryCreators(organizationId, { featuredOnly: true, sort: "featured", page: 1 });
  return result.items.slice(0, limit);
}
