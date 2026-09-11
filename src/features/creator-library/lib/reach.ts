/**
 * Reach tiers (spec §8). A creator's tier is a pure function of Total Reach
 * (Instagram + TikTok + YouTube), which is already computed at read time by
 * resolveAudienceBreakdown in lib/audience.ts — nothing is stored, so the tier
 * updates automatically whenever a follower count changes.
 */

export type ReachTierKey = "emerging" | "rising" | "established" | "influential" | "major" | "elite";

export type ReachTier = {
  key: ReachTierKey;
  label: string;
  /** Inclusive lower bound. */
  min: number;
  /** Exclusive upper bound; null = no cap. */
  max: number | null;
  /** e.g. "1K–10K" */
  range: string;
};

export const REACH_TIERS: ReachTier[] = [
  { key: "emerging", label: "Emerging", min: 1_000, max: 10_000, range: "1K–10K" },
  { key: "rising", label: "Rising", min: 10_000, max: 50_000, range: "10K–50K" },
  { key: "established", label: "Established", min: 50_000, max: 100_000, range: "50K–100K" },
  { key: "influential", label: "Influential", min: 100_000, max: 500_000, range: "100K–500K" },
  { key: "major", label: "Major", min: 500_000, max: 1_000_000, range: "500K–1M" },
  { key: "elite", label: "Elite", min: 1_000_000, max: null, range: "1M+" },
];

const TIER_BY_KEY = new Map(REACH_TIERS.map((tier) => [tier.key, tier]));

/** Total reach → tier, or null when there is no meaningful audience (< 1K). */
export function resolveReachTier(total: number): ReachTier | null {
  if (!Number.isFinite(total) || total < REACH_TIERS[0].min) return null;
  for (const tier of REACH_TIERS) {
    if (total >= tier.min && (tier.max == null || total < tier.max)) return tier;
  }
  return REACH_TIERS[REACH_TIERS.length - 1];
}

export function reachTierFromKey(key: string | null | undefined): ReachTier | null {
  return key ? (TIER_BY_KEY.get(key as ReachTierKey) ?? null) : null;
}
