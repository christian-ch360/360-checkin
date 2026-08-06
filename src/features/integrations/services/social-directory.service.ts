import "server-only";

import { unstable_cache } from "next/cache";
import type { SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type SocialDirectoryEntry = {
  totalFollowers: number;
  verifiedPlatformCount: number;
  connectedPlatforms: SocialPlatform[];
  verifiedPlatforms: SocialPlatform[];
  platformFollowers: Partial<Record<SocialPlatform, number>>;
  lastSyncedAt: Date | null;
  /** Sum of (current - as-of-30-days-ago) across every connected platform with enough history. Null when no platform has a 30-day-old data point yet. */
  monthlyGrowth: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

async function computeSocialDirectory(organizationId: string): Promise<Record<string, SocialDirectoryEntry>> {
  const connections = await prisma.socialConnection.findMany({
    where: { member: { organizationId }, followerCount: { not: null } },
    select: { memberId: true, platform: true, followerCount: true, verified: true, lastSyncedAt: true },
  });
  if (connections.length === 0) return {};

  const memberIds = Array.from(new Set(connections.map((c) => c.memberId)));
  const monthAgo = new Date(Date.now() - 30 * DAY_MS);

  // One query for the whole org: most recent history row at/before 30 days
  // ago, per member+platform — used as the "fastest growth" baseline.
  const historyRows = await prisma.socialFollowerHistory.findMany({
    where: { memberId: { in: memberIds }, capturedAt: { lte: monthAgo } },
    orderBy: { capturedAt: "desc" },
    select: { memberId: true, platform: true, followers: true },
  });
  const baselineByKey = new Map<string, number>();
  for (const row of historyRows) {
    const key = `${row.memberId}:${row.platform}`;
    if (!baselineByKey.has(key)) baselineByKey.set(key, row.followers);
  }

  const byMember: Record<string, SocialDirectoryEntry> = {};
  for (const c of connections) {
    if (c.followerCount == null) continue;
    const entry = (byMember[c.memberId] ??= {
      totalFollowers: 0,
      verifiedPlatformCount: 0,
      connectedPlatforms: [],
      verifiedPlatforms: [],
      platformFollowers: {},
      lastSyncedAt: null,
      monthlyGrowth: null,
    });
    entry.totalFollowers += c.followerCount;
    if (c.verified) {
      entry.verifiedPlatformCount += 1;
      entry.verifiedPlatforms.push(c.platform);
    }
    entry.connectedPlatforms.push(c.platform);
    entry.platformFollowers[c.platform] = c.followerCount;
    if (c.lastSyncedAt && (!entry.lastSyncedAt || c.lastSyncedAt > entry.lastSyncedAt)) entry.lastSyncedAt = c.lastSyncedAt;

    const baseline = baselineByKey.get(`${c.memberId}:${c.platform}`);
    if (baseline != null) entry.monthlyGrowth = (entry.monthlyGrowth ?? 0) + (c.followerCount - baseline);
  }

  return byMember;
}

/**
 * Powers directory filters/sort (platform-connected, follower range,
 * verified, recently synced, largest audience, fastest growth) with one
 * org-wide query instead of one per row. Cached 60s per organization — a
 * short window is fine for facet filtering/sorting and avoids recomputing
 * on every keystroke-driven search param change.
 */
const getCachedSocialDirectory = unstable_cache(
  (organizationId: string) => computeSocialDirectory(organizationId),
  ["social-directory-aggregates"],
  { revalidate: 60, tags: ["social-directory"] }
);

/** unstable_cache round-trips through JSON, so lastSyncedAt comes back as an ISO string on a cache hit — revived to a real Date here. */
export async function getSocialDirectoryAggregates(organizationId: string): Promise<Record<string, SocialDirectoryEntry>> {
  const raw = await getCachedSocialDirectory(organizationId);
  const revived: Record<string, SocialDirectoryEntry> = {};
  for (const [memberId, entry] of Object.entries(raw)) {
    revived[memberId] = { ...entry, lastSyncedAt: entry.lastSyncedAt ? new Date(entry.lastSyncedAt) : null };
  }
  return revived;
}
