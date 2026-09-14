import "server-only";
import { isModashConfigured, modashRequest } from "@/lib/integrations/modash/modash-client";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import type {
  ModashCreatorReport,
  ModashDiscoveredCreator,
  ModashDiscoveryQuery,
  ModashResult,
} from "@/lib/integrations/modash/modash.types";

export { isModashConfigured };

/**
 * Creator Discovery — search Modash for creators matching a campaign's
 * requirements (categories, platforms, location, audience size). Called once
 * per requested platform, since Modash's Discovery API is per-platform.
 *
 * Endpoint shape follows Modash's documented `/{platform}/search` Discovery
 * API (https://docs.modash.io) — verify field names against the current
 * Modash API reference once MODASH_API_KEY is set; this is the only place
 * in the codebase that would need updating if their contract has changed.
 */
export async function searchCreators(query: ModashDiscoveryQuery): Promise<ModashResult<ModashDiscoveredCreator[]>> {
  if (!isModashConfigured()) {
    return { ok: false, error: "Modash is not configured — set MODASH_API_KEY to enable creator discovery." };
  }

  const results: ModashDiscoveredCreator[] = [];
  for (const platform of query.platforms) {
    const response = await modashRequest<{ creators: unknown[] }>(`/${platform.toLowerCase()}/search`, {
      method: "POST",
      body: {
        filter: {
          influencer: {
            followers: { min: query.minFollowers ?? undefined, max: query.maxFollowers ?? undefined },
            relevance: query.categories.map((category) => CONTENT_CATEGORY_LABELS[category]),
            location: query.location?.country ? [query.location.country] : undefined,
          },
        },
        limit: query.limit,
      },
    });
    if (!response.ok) return response;
    results.push(...normalizeDiscoveryResponse(platform, response.data));
  }
  return { ok: true, data: results };
}

/**
 * Creator Enrichment — pull the full audience/performance report for one
 * discovered creator. Follows Modash's `/{platform}/report/{userId}` shape.
 */
export async function getCreatorReport(
  platform: ModashDiscoveredCreator["platform"],
  modashUserId: string,
): Promise<ModashResult<ModashCreatorReport>> {
  if (!isModashConfigured()) {
    return { ok: false, error: "Modash is not configured — set MODASH_API_KEY to enable creator enrichment." };
  }
  const response = await modashRequest<Record<string, unknown>>(`/${platform.toLowerCase()}/report/${modashUserId}`);
  if (!response.ok) return response;
  return { ok: true, data: normalizeReportResponse(platform, modashUserId, response.data) };
}

// --- Response normalization -------------------------------------------------
// Modash's raw payload shape is intentionally isolated to these two
// functions so `searchCreators`/`getCreatorReport`'s callers never touch
// Modash's wire format — only our own `ModashDiscoveredCreator`/
// `ModashCreatorReport` types.

function normalizeDiscoveryResponse(
  platform: ModashDiscoveredCreator["platform"],
  raw: { creators: unknown[] },
): ModashDiscoveredCreator[] {
  return raw.creators.map((entry) => {
    const row = entry as Record<string, unknown>;
    const profile = (row.userProfile ?? row.profile ?? row) as Record<string, unknown>;
    return {
      modashUserId: String(profile.userId ?? profile.id ?? ""),
      platform,
      handle: String(profile.username ?? profile.handle ?? ""),
      displayName: (profile.fullname as string) ?? (profile.name as string) ?? null,
      profileImageUrl: (profile.picture as string) ?? (profile.profileImageUrl as string) ?? null,
      followers: Number(profile.followers ?? 0),
      engagementRate: profile.engagementRate != null ? Number(profile.engagementRate) : null,
    };
  });
}

function normalizeReportResponse(
  platform: ModashDiscoveredCreator["platform"],
  modashUserId: string,
  raw: Record<string, unknown>,
): ModashCreatorReport {
  const profile = (raw.profile ?? raw) as Record<string, unknown>;
  const audience = raw.audience as Record<string, unknown> | undefined;
  return {
    modashUserId,
    platform,
    handle: String(profile.username ?? ""),
    followers: Number(profile.followers ?? 0),
    engagementRate: profile.engagementRate != null ? Number(profile.engagementRate) : null,
    averageViews: profile.avgViews != null ? Number(profile.avgViews) : null,
    audience: audience
      ? {
          genderFemaleShare: audience.genderFemalePercentage != null ? Number(audience.genderFemalePercentage) / 100 : null,
          topAudienceCountries: Array.isArray(audience.geoCountries)
            ? (audience.geoCountries as { name: string; weight: number }[]).map((c) => ({ country: c.name, share: c.weight }))
            : [],
          topAudienceAgeRanges: Array.isArray(audience.genderAgeDistribution)
            ? (audience.genderAgeDistribution as { code: string; weight: number }[]).map((a) => ({ range: a.code, share: a.weight }))
            : [],
        }
      : null,
    estimatedCostPerPost: raw.estimatedCost != null ? Number(raw.estimatedCost) : null,
  };
}
