import "server-only";

import type { SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const SPARKLINE_WINDOW_DAYS = 30;
/** Below this many points a sparkline reads as noise, not a trend — show "Collecting data..." instead. */
const MIN_SPARKLINE_POINTS = 3;

export type SparklinePoint = { capturedAt: Date; followers: number };

export type FollowerGrowth = {
  current: number | null;
  todayDelta: number | null;
  sevenDayDelta: number | null;
  thirtyDayDelta: number | null;
  ninetyDayDelta: number | null;
  lifetimeDelta: number | null;
  /** 7-day percent change — null when there's no 7-day-old baseline, or that baseline was 0 (division by zero). */
  trendPercent: number | null;
  /** Last 30 days of history, oldest first — for the tiny trend chart. Empty until there's enough data. */
  sparkline: SparklinePoint[];
  /** False until there are enough points for the sparkline to mean anything — drives the "Collecting data..." fallback. */
  hasEnoughHistory: boolean;
};

const EMPTY_GROWTH: FollowerGrowth = {
  current: null,
  todayDelta: null,
  sevenDayDelta: null,
  thirtyDayDelta: null,
  ninetyDayDelta: null,
  lifetimeDelta: null,
  trendPercent: null,
  sparkline: [],
  hasEnoughHistory: false,
};

/** The most recent SocialFollowerHistory row at or before `cutoff` — i.e. "what the count was as of N days ago," tolerant of syncs not landing on exact day boundaries. */
async function followersAsOf(memberId: string, platform: SocialPlatform, cutoff: Date): Promise<number | null> {
  const row = await prisma.socialFollowerHistory.findFirst({
    where: { memberId, platform, capturedAt: { lte: cutoff } },
    orderBy: { capturedAt: "desc" },
    select: { followers: true },
  });
  return row?.followers ?? null;
}

/**
 * All growth deltas are computed purely from SocialFollowerHistory —
 * nothing here is stored redundantly. `currentFollowerCount` is passed in
 * from the caller's already-fetched SocialConnection row rather than
 * re-derived from history, since that column is the single source of truth
 * for "right now" and is always updated in the same transaction as the
 * history row that captures it (see syncConnection()).
 */
export async function getFollowerGrowth(
  memberId: string,
  platform: SocialPlatform,
  currentFollowerCount: number | null
): Promise<FollowerGrowth> {
  if (currentFollowerCount == null) return EMPTY_GROWTH;

  const now = Date.now();
  const [dayAgo, weekAgo, monthAgo, quarterAgo, first, sparklineRows] = await Promise.all([
    followersAsOf(memberId, platform, new Date(now - 1 * DAY_MS)),
    followersAsOf(memberId, platform, new Date(now - 7 * DAY_MS)),
    followersAsOf(memberId, platform, new Date(now - 30 * DAY_MS)),
    followersAsOf(memberId, platform, new Date(now - 90 * DAY_MS)),
    prisma.socialFollowerHistory.findFirst({
      where: { memberId, platform },
      orderBy: { capturedAt: "asc" },
      select: { followers: true },
    }),
    prisma.socialFollowerHistory.findMany({
      where: { memberId, platform, capturedAt: { gte: new Date(now - SPARKLINE_WINDOW_DAYS * DAY_MS) } },
      orderBy: { capturedAt: "asc" },
      select: { followers: true, capturedAt: true },
    }),
  ]);

  const delta = (base: number | null) => (base == null ? null : currentFollowerCount - base);
  const sevenDayDelta = delta(weekAgo);

  return {
    current: currentFollowerCount,
    todayDelta: delta(dayAgo),
    sevenDayDelta,
    thirtyDayDelta: delta(monthAgo),
    ninetyDayDelta: delta(quarterAgo),
    lifetimeDelta: delta(first?.followers ?? null),
    trendPercent: weekAgo != null && weekAgo !== 0 && sevenDayDelta != null ? (sevenDayDelta / weekAgo) * 100 : null,
    sparkline: sparklineRows,
    hasEnoughHistory: sparklineRows.length >= MIN_SPARKLINE_POINTS,
  };
}

/** Batch version for a member's whole connection set — one Promise.all per platform rather than N+1 across the page. Only computes for platforms with a live follower count (CONNECTED or ERROR-but-previously-synced); DISCONNECTED/never-synced platforms get the empty shape without hitting the DB. */
export async function getFollowerGrowthForMember(
  memberId: string,
  connections: { platform: SocialPlatform; followerCount: number | null }[]
): Promise<Record<SocialPlatform, FollowerGrowth>> {
  const entries = await Promise.all(
    connections.map(async (c) => [c.platform, await getFollowerGrowth(memberId, c.platform, c.followerCount)] as const)
  );
  return Object.fromEntries(entries) as Record<SocialPlatform, FollowerGrowth>;
}
