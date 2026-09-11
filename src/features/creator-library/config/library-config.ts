import type { SocialPlatform } from "@prisma/client";

/** Grid page size for the "Load More" pager (spec §26). */
export const LIBRARY_PAGE_SIZE = 12;

export const LIBRARY_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE"];

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
};

/** Audience metric noun per platform — YouTube counts "subscribers". */
export const PLATFORM_METRIC_NOUN: Record<SocialPlatform, string> = {
  INSTAGRAM: "followers",
  TIKTOK: "followers",
  YOUTUBE: "subscribers",
};

export type FollowerBucket = {
  value: string;
  label: string;
  min: number;
  /** Exclusive upper bound; null = no cap. */
  max: number | null;
};

/** Spec §7 "FOLLOWER SIZE" — matched against a creator's total audience. */
export const FOLLOWER_BUCKETS: FollowerBucket[] = [
  { value: "u10k", label: "Under 10K", min: 0, max: 10_000 },
  { value: "10k-50k", label: "10K – 50K", min: 10_000, max: 50_000 },
  { value: "50k-100k", label: "50K – 100K", min: 50_000, max: 100_000 },
  { value: "100k-500k", label: "100K – 500K", min: 100_000, max: 500_000 },
  { value: "500k-1m", label: "500K – 1M", min: 500_000, max: 1_000_000 },
  { value: "1m+", label: "1M+", min: 1_000_000, max: null },
];

export function resolveFollowerBucket(value: string | undefined | null): FollowerBucket | null {
  if (!value) return null;
  return FOLLOWER_BUCKETS.find((bucket) => bucket.value === value) ?? null;
}

/**
 * Spec §7 "LOCATION" — quick presets. Location is a free-text field on
 * Member, so these are prefix/contains hints, and the search box also accepts
 * any city. Kept short and editorial; "Other" is handled in the UI as "clear".
 */
export const LOCATION_PRESETS = ["Los Angeles", "New York", "Miami", "Atlanta", "Chicago", "Austin"];

export type LibrarySortKey =
  | "relevance"
  | "followers_desc"
  | "followers_asc"
  | "newest"
  | "alphabetical"
  | "recently_added"
  | "featured";

export const LIBRARY_SORT_OPTIONS: { value: LibrarySortKey; label: string }[] = [
  { value: "relevance", label: "Most Relevant" },
  { value: "followers_desc", label: "Most Followers" },
  { value: "followers_asc", label: "Least Followers" },
  { value: "newest", label: "Newest" },
  { value: "alphabetical", label: "Alphabetical A–Z" },
  { value: "recently_added", label: "Recently Added" },
  { value: "featured", label: "Featured" },
];

export const DEFAULT_LIBRARY_SORT: LibrarySortKey = "relevance";

export function resolveLibrarySort(value: string | undefined | null): LibrarySortKey {
  const match = LIBRARY_SORT_OPTIONS.find((option) => option.value === value);
  return match ? match.value : DEFAULT_LIBRARY_SORT;
}

/**
 * A distinct CH360 identity marker, deliberately NOT a generic social
 * "verified" checkmark. Verified CH360 members (their Member record passed
 * identity verification) get the stronger treatment; everyone else in the
 * library still carries the network mark.
 */
export const C360_STATUS = {
  verified: { label: "Verified CH360 Member", short: "Verified" },
  network: { label: "CH360 Creator", short: "Network" },
} as const;
