import "server-only";

import type { ContentCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAudienceBreakdown, type AudienceBreakdown } from "@/features/creator-library/lib/audience";
import { resolveReachTier, type ReachTier } from "@/features/creator-library/lib/reach";
import { formatLocationLabel } from "@/features/creator-library/lib/location";

/**
 * Read layer for the authenticated Operations management surface
 * (/admin/creator-library). Profile-centric: every CreatorLibraryProfile
 * (linked + standalone) is a row, PLUS every active CREATOR member that has no
 * profile yet (so Ops can still opt them in). Gated by `members.manage`.
 */

type SyncMap = Record<string, Partial<Record<"INSTAGRAM" | "TIKTOK" | "YOUTUBE", number>>>;

async function loadSyncedFollowers(memberIds: string[]): Promise<SyncMap> {
  const ids = memberIds.filter(Boolean);
  if (ids.length === 0) return {};
  const connections = await prisma.socialConnection.findMany({
    where: { memberId: { in: ids }, followerCount: { not: null } },
    select: { memberId: true, platform: true, followerCount: true },
  });
  const byMember: SyncMap = {};
  for (const c of connections) {
    if (c.followerCount == null) continue;
    (byMember[c.memberId] ??= {})[c.platform] = c.followerCount;
  }
  return byMember;
}

export type AdminCreatorRow = {
  /** stable row key: the profile id, or `member:<id>` for a member with no profile */
  key: string;
  profileId: string | null;
  memberId: string | null;
  name: string;
  username: string | null;
  email: string | null;
  photoUrl: string | null;
  location: string | null;
  categories: ContentCategory[];
  verified: boolean;
  standalone: boolean;
  inLibrary: boolean;
  visible: boolean;
  featured: boolean;
  audience: AudienceBreakdown;
  reachTier: ReachTier | null;
  updatedAt: Date | null;
};

export type AdminCreatorFilter = "all" | "published" | "hidden" | "featured" | "standalone" | "not_in_library";

export async function listAdminCreators(
  organizationId: string,
  options: { search?: string; filter?: AdminCreatorFilter; category?: ContentCategory } = {},
): Promise<AdminCreatorRow[]> {
  const [profiles, members] = await Promise.all([
    prisma.creatorLibraryProfile.findMany({
      where: { organizationId },
      select: {
        id: true,
        memberId: true,
        visible: true,
        featured: true,
        categories: true,
        name: true,
        email: true,
        usernameHandle: true,
        imageUrl: true,
        locationLabel: true,
        country: true,
        state: true,
        city: true,
        instagramFollowers: true,
        tiktokFollowers: true,
        youtubeSubscribers: true,
        updatedAt: true,
        member: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            username: true,
            email: true,
            profilePhotoUrl: true,
            location: true,
            contentCategories: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.member.findMany({
      where: { organizationId, role: "CREATOR", status: "ACTIVE", deletedAt: null },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        username: true,
        email: true,
        profilePhotoUrl: true,
        location: true,
        contentCategories: true,
        verificationStatus: true,
      },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const synced = await loadSyncedFollowers([
    ...profiles.map((p) => p.memberId).filter((id): id is string => Boolean(id)),
    ...members.map((m) => m.id),
  ]);
  const memberIdsWithProfile = new Set(profiles.map((p) => p.memberId).filter(Boolean));

  const rows: AdminCreatorRow[] = [];

  for (const p of profiles) {
    const audience = resolveAudienceBreakdown(
      { instagramFollowers: p.instagramFollowers, tiktokFollowers: p.tiktokFollowers, youtubeSubscribers: p.youtubeSubscribers },
      (p.memberId ? synced[p.memberId] : undefined) ?? {},
    );
    const categories = p.categories.length > 0 ? p.categories : (p.member?.contentCategories ?? []);
    rows.push({
      key: p.id,
      profileId: p.id,
      memberId: p.memberId,
      name: (p.member?.displayName ?? p.member?.fullName ?? p.name)?.trim() || "Unnamed creator",
      username: p.member?.username ?? p.usernameHandle ?? null,
      email: p.member?.email ?? p.email ?? null,
      photoUrl: p.imageUrl ?? p.member?.profilePhotoUrl ?? null,
      location:
        formatLocationLabel({ country: p.country, state: p.state, city: p.city }) ??
        p.locationLabel ??
        p.member?.location ??
        null,
      categories,
      verified: p.member?.verificationStatus === "VERIFIED",
      standalone: p.memberId == null,
      inLibrary: true,
      visible: p.visible,
      featured: p.featured,
      audience,
      reachTier: resolveReachTier(audience.total),
      updatedAt: p.updatedAt,
    });
  }

  for (const m of members) {
    if (memberIdsWithProfile.has(m.id)) continue;
    const audience = resolveAudienceBreakdown(
      { instagramFollowers: null, tiktokFollowers: null, youtubeSubscribers: null },
      synced[m.id] ?? {},
    );
    rows.push({
      key: `member:${m.id}`,
      profileId: null,
      memberId: m.id,
      name: (m.displayName ?? m.fullName).trim(),
      username: m.username,
      email: m.email,
      photoUrl: m.profilePhotoUrl,
      location: m.location,
      categories: m.contentCategories,
      verified: m.verificationStatus === "VERIFIED",
      standalone: false,
      inLibrary: false,
      visible: false,
      featured: false,
      audience,
      reachTier: resolveReachTier(audience.total),
      updatedAt: null,
    });
  }

  const search = options.search?.trim().toLowerCase();
  let filtered = search
    ? rows.filter((r) =>
        [r.name, r.username, r.email].filter(Boolean).some((v) => v!.toLowerCase().includes(search)),
      )
    : rows;

  switch (options.filter) {
    case "published":
      filtered = filtered.filter((r) => r.visible);
      break;
    case "hidden":
      filtered = filtered.filter((r) => r.inLibrary && !r.visible);
      break;
    case "featured":
      filtered = filtered.filter((r) => r.featured);
      break;
    case "standalone":
      filtered = filtered.filter((r) => r.standalone);
      break;
    case "not_in_library":
      filtered = filtered.filter((r) => !r.inLibrary);
      break;
  }

  if (options.category) {
    filtered = filtered.filter((r) => r.categories.includes(options.category as ContentCategory));
  }

  return filtered.sort((a, b) => b.audience.total - a.audience.total || a.name.localeCompare(b.name));
}

export type AdminCreatorEditor = {
  profileId: string;
  standalone: boolean;
  linkedMemberId: string | null;
  // resolved identity source (member when linked, else the profile)
  fullName: string;
  displayName: string | null;
  memberEmail: string | null;
  memberProfilePhotoUrl: string | null;
  memberLocation: string | null;
  memberBio: string | null;
  memberCategories: ContentCategory[];
  verified: boolean;
  syncedFollowers: { instagram: number | null; tiktok: number | null; youtube: number | null };
  profile: {
    visible: boolean;
    featured: boolean;
    displayOrder: number | null;
    headline: string | null;
    libraryBio: string | null;
    categories: ContentCategory[];
    imageUrl: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    usernameHandle: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
    websiteUrl: string | null;
    companyName: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    instagramFollowers: number | null;
    tiktokFollowers: number | null;
    youtubeSubscribers: number | null;
    publishedAt: Date | null;
  };
};

export async function getAdminCreatorEditor(
  organizationId: string,
  profileId: string,
): Promise<AdminCreatorEditor | null> {
  const p = await prisma.creatorLibraryProfile.findFirst({
    where: { id: profileId, organizationId },
    select: {
      id: true,
      memberId: true,
      visible: true,
      featured: true,
      displayOrder: true,
      headline: true,
      libraryBio: true,
      categories: true,
      imageUrl: true,
      name: true,
      email: true,
      phone: true,
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
      member: {
        select: {
          id: true,
          fullName: true,
          displayName: true,
          email: true,
          profilePhotoUrl: true,
          location: true,
          bio: true,
          contentCategories: true,
          verificationStatus: true,
        },
      },
    },
  });
  if (!p) return null;

  const synced = p.memberId ? await loadSyncedFollowers([p.memberId]) : {};
  const s = (p.memberId ? synced[p.memberId] : undefined) ?? {};

  return {
    profileId: p.id,
    standalone: p.memberId == null,
    linkedMemberId: p.memberId,
    fullName: p.member?.fullName ?? p.name ?? "Unnamed creator",
    displayName: p.member?.displayName ?? null,
    memberEmail: p.member?.email ?? null,
    memberProfilePhotoUrl: p.member?.profilePhotoUrl ?? null,
    memberLocation: p.member?.location ?? null,
    memberBio: p.member?.bio ?? null,
    memberCategories: p.member?.contentCategories ?? [],
    verified: p.member?.verificationStatus === "VERIFIED",
    syncedFollowers: { instagram: s.INSTAGRAM ?? null, tiktok: s.TIKTOK ?? null, youtube: s.YOUTUBE ?? null },
    profile: {
      visible: p.visible,
      featured: p.featured,
      displayOrder: p.displayOrder,
      headline: p.headline,
      libraryBio: p.libraryBio,
      categories: p.categories,
      imageUrl: p.imageUrl,
      name: p.name,
      email: p.email,
      phone: p.phone,
      usernameHandle: p.usernameHandle,
      instagramUrl: p.instagramUrl,
      tiktokUrl: p.tiktokUrl,
      youtubeUrl: p.youtubeUrl,
      websiteUrl: p.websiteUrl,
      companyName: p.companyName,
      country: p.country,
      state: p.state,
      city: p.city,
      instagramFollowers: p.instagramFollowers,
      tiktokFollowers: p.tiktokFollowers,
      youtubeSubscribers: p.youtubeSubscribers,
      publishedAt: p.publishedAt,
    },
  };
}

export async function getAdminLibrarySummary(organizationId: string): Promise<{
  totalCreators: number;
  profiles: number;
  published: number;
  featured: number;
  standalone: number;
}> {
  const [totalCreators, profiles, published, featured, standalone] = await Promise.all([
    prisma.member.count({ where: { organizationId, role: "CREATOR", status: "ACTIVE", deletedAt: null } }),
    prisma.creatorLibraryProfile.count({ where: { organizationId } }),
    prisma.creatorLibraryProfile.count({ where: { organizationId, visible: true } }),
    prisma.creatorLibraryProfile.count({ where: { organizationId, featured: true, visible: true } }),
    prisma.creatorLibraryProfile.count({ where: { organizationId, memberId: null } }),
  ]);
  return { totalCreators, profiles, published, featured, standalone };
}

/** Members eligible to be linked to a standalone profile (active creators without a profile). */
export async function listLinkableMembers(organizationId: string, search: string): Promise<{ id: string; name: string; email: string }[]> {
  if (!search.trim()) return [];
  const members = await prisma.member.findMany({
    where: {
      organizationId,
      role: "CREATOR",
      status: "ACTIVE",
      deletedAt: null,
      creatorLibraryProfile: null,
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, displayName: true, email: true },
    take: 10,
  });
  return members.map((m) => ({ id: m.id, name: m.displayName ?? m.fullName, email: m.email }));
}
