import type { ContentCategory, SocialPlatform } from "@prisma/client";

/**
 * Modash's actual public API (https://docs.modash.io) is organized around
 * per-platform "Discovery" (search) and "Report" (enrichment) endpoints —
 * these types model our own normalized shape, not Modash's raw response
 * envelope, so the rest of the app never depends on Modash's wire format
 * directly. `modash-client.ts` is the only file that would ever need to
 * change if Modash's actual response shape differs once real credentials
 * are in place.
 */

export type ModashPlatform = Extract<SocialPlatform, "INSTAGRAM" | "TIKTOK" | "YOUTUBE">;

export type ModashDiscoveryQuery = {
  platforms: ModashPlatform[];
  categories: ContentCategory[];
  minFollowers: number | null;
  maxFollowers: number | null;
  location: { country: string | null; state: string | null; city: string | null } | null;
  /** Hard cap on results returned per discovery call. */
  limit: number;
};

/** One row from a Modash Discovery search — a candidate before enrichment. */
export type ModashDiscoveredCreator = {
  modashUserId: string;
  platform: ModashPlatform;
  handle: string;
  displayName: string | null;
  profileImageUrl: string | null;
  followers: number;
  engagementRate: number | null;
};

/** The richer per-creator "Report" — audience + performance analytics. */
export type ModashCreatorReport = {
  modashUserId: string;
  platform: ModashPlatform;
  handle: string;
  followers: number;
  engagementRate: number | null;
  averageViews: number | null;
  audience: {
    /** 0-1 fraction, e.g. 0.62 = 62% of the audience is female. */
    genderFemaleShare: number | null;
    topAudienceCountries: { country: string; share: number }[];
    topAudienceAgeRanges: { range: string; share: number }[];
  } | null;
  estimatedCostPerPost: number | null;
};

export type ModashResult<T> = { ok: true; data: T } | { ok: false; error: string };
