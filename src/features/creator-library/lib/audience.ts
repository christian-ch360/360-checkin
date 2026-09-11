import type { SocialPlatform } from "@prisma/client";
import { formatCompactNumber } from "@/lib/utils/format";
import { LIBRARY_PLATFORMS } from "@/features/creator-library/config/library-config";

/**
 * Per-platform audience number resolution (spec §11–12).
 *
 * Ops-entered counts on the CreatorLibraryProfile win; when a platform's
 * number is null there, we fall back to that creator's *synced*
 * SocialConnection.followerCount; if neither exists, that platform simply has
 * no data (never invented — spec §11).
 *
 * Total audience is always the sum of whatever platform numbers are
 * available — computed here, never stored, so it can't drift.
 */

export type ManualFollowerCounts = {
  instagramFollowers: number | null;
  tiktokFollowers: number | null;
  youtubeSubscribers: number | null;
};

export type SyncedFollowerCounts = Partial<Record<SocialPlatform, number>>;

export type PlatformAudience = { platform: SocialPlatform; count: number };

export type AudienceBreakdown = {
  /** Platforms that have a real number, largest first. Empty when no data exists. */
  platforms: PlatformAudience[];
  /** Sum of `platforms`. 0 when `platforms` is empty. */
  total: number;
  /** True when there is no audience data at all for this creator. */
  isEmpty: boolean;
};

const MANUAL_KEY: Record<SocialPlatform, keyof ManualFollowerCounts> = {
  INSTAGRAM: "instagramFollowers",
  TIKTOK: "tiktokFollowers",
  YOUTUBE: "youtubeSubscribers",
};

export function resolveAudienceBreakdown(
  manual: ManualFollowerCounts,
  synced: SyncedFollowerCounts,
): AudienceBreakdown {
  const platforms: PlatformAudience[] = [];

  for (const platform of LIBRARY_PLATFORMS) {
    const manualValue = manual[MANUAL_KEY[platform]];
    const syncedValue = synced[platform];
    const count = manualValue ?? syncedValue ?? null;
    if (count != null && count > 0) {
      platforms.push({ platform, count });
    }
  }

  platforms.sort((a, b) => b.count - a.count);
  const total = platforms.reduce((sum, entry) => sum + entry.count, 0);

  return { platforms, total, isEmpty: platforms.length === 0 };
}

/** "248K", "1.2M", "850" — compact for display, full value kept in the DB. */
export function formatAudience(value: number): string {
  return formatCompactNumber(value);
}
