import "server-only";

import type { SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "@/lib/crypto/token-cipher";
import { PROVIDERS, isPlatformConfigured } from "@/features/integrations/config/providers";
import { signOAuthState } from "@/features/integrations/services/oauth-state";
import { ensureFreshAccessToken } from "@/features/integrations/services/token-refresh.service";
import { IntegrationError } from "@/features/integrations/services/errors";
import { AUTH_PROVIDER_ENTRIES, COMING_SOON_ENTRIES, type IntegrationEntry } from "@/features/integrations/config/catalog";
import { getOrgStoreConnectionSummary } from "@/features/integrations/services/store-connections.service";

function redirectUriFor(platform: SocialPlatform): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/integrations/${platform.toLowerCase()}/callback`;
}

/** Returns null (rather than throwing) when the platform has no credentials configured — the caller renders "Not configured". */
export function buildAuthorizeUrl(platform: SocialPlatform, memberId: string): string | null {
  if (!isPlatformConfigured(platform)) return null;
  const state = signOAuthState(memberId, platform);
  return PROVIDERS[platform].buildAuthorizeUrl(redirectUriFor(platform), state);
}

export async function exchangeAndStoreConnection(platform: SocialPlatform, memberId: string, code: string) {
  const provider = PROVIDERS[platform];
  const token = await provider.exchangeCode(code, redirectUriFor(platform));
  const stats = await provider.fetchStats(token.accessToken);

  // CreatorHub360 needs a Creator/Business Instagram account to read
  // analytics through the Graph API — a personal account either can't
  // complete this flow or returns near-empty data. Bail before the upsert so
  // no confusing half-connected row ever lands in the DB.
  if (platform === "INSTAGRAM" && stats.accountType === "PERSONAL") {
    throw new IntegrationError("instagram_personal_account");
  }

  await prisma.socialConnection.upsert({
    where: { memberId_platform: { memberId, platform } },
    update: {
      status: "CONNECTED",
      externalAccountId: stats.externalAccountId,
      externalUsername: stats.externalUsername,
      followerCount: stats.followerCount,
      profileImageUrl: stats.profileImageUrl,
      followingCount: stats.followingCount,
      postCount: stats.postCount,
      likesCount: stats.likesCount,
      accountType: stats.accountType,
      accessTokenEnc: encryptToken(token.accessToken),
      refreshTokenEnc: token.refreshToken ? encryptToken(token.refreshToken) : null,
      tokenExpiresAt: token.expiresInSec ? new Date(Date.now() + token.expiresInSec * 1000) : null,
      lastSyncedAt: new Date(),
      lastSyncError: null,
    },
    create: {
      memberId,
      platform,
      status: "CONNECTED",
      externalAccountId: stats.externalAccountId,
      externalUsername: stats.externalUsername,
      followerCount: stats.followerCount,
      profileImageUrl: stats.profileImageUrl,
      followingCount: stats.followingCount,
      postCount: stats.postCount,
      likesCount: stats.likesCount,
      accountType: stats.accountType,
      accessTokenEnc: encryptToken(token.accessToken),
      refreshTokenEnc: token.refreshToken ? encryptToken(token.refreshToken) : null,
      tokenExpiresAt: token.expiresInSec ? new Date(Date.now() + token.expiresInSec * 1000) : null,
      lastSyncedAt: new Date(),
    },
  });

  // Keep the self-reported Member.followerCount roughly in sync once a real
  // connection exists — the higher of the two, since a member may be
  // connected on only one of several platforms they listed.
  if (stats.followerCount != null) {
    const member = await prisma.member.findUnique({ where: { id: memberId }, select: { followerCount: true } });
    if (!member?.followerCount || stats.followerCount > member.followerCount) {
      await prisma.member.update({ where: { id: memberId }, data: { followerCount: stats.followerCount } });
    }
  }
}

export async function getConnectionsForMember(memberId: string) {
  const connections = await prisma.socialConnection.findMany({ where: { memberId } });
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  return (Object.keys(PROVIDERS) as SocialPlatform[]).map((platform) => {
    const connection = byPlatform.get(platform);
    return {
      platform,
      label: PROVIDERS[platform].label,
      configured: isPlatformConfigured(platform),
      status: connection?.status ?? "DISCONNECTED",
      externalUsername: connection?.externalUsername ?? null,
      followerCount: connection?.followerCount ?? null,
      followingCount: connection?.followingCount ?? null,
      postCount: connection?.postCount ?? null,
      likesCount: connection?.likesCount ?? null,
      profileImageUrl: connection?.profileImageUrl ?? null,
      lastSyncedAt: connection?.lastSyncedAt ?? null,
      lastSyncError: connection?.lastSyncError ?? null,
    };
  });
}

export async function disconnectConnection(memberId: string, platform: SocialPlatform) {
  await prisma.socialConnection.updateMany({
    where: { memberId, platform },
    data: { status: "DISCONNECTED", accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null },
  });
}

export async function syncConnection(memberId: string, platform: SocialPlatform) {
  const connection = await prisma.socialConnection.findUnique({ where: { memberId_platform: { memberId, platform } } });
  if (!connection?.accessTokenEnc) throw new Error("Not connected");

  const provider = PROVIDERS[platform];
  try {
    const accessToken = await ensureFreshAccessToken(platform, connection);
    const stats = await provider.fetchStats(accessToken);
    await prisma.socialConnection.update({
      where: { id: connection.id },
      data: {
        status: "CONNECTED",
        externalUsername: stats.externalUsername,
        followerCount: stats.followerCount,
        profileImageUrl: stats.profileImageUrl,
        followingCount: stats.followingCount,
        postCount: stats.postCount,
        likesCount: stats.likesCount,
        accountType: stats.accountType,
        lastSyncedAt: new Date(),
        lastSyncError: null,
      },
    });
  } catch (err) {
    // Log the real error for debugging — never expose provider/API internals
    // to the member. This catch never writes follower/etc. fields, so a
    // failed sync can't clobber the last successful data.
    console.error(`[integrations] ${platform} sync failed for member ${memberId}:`, err);
    const friendlyMessage = `We couldn't refresh your ${provider.label} stats right now. Please try again in a few minutes.`;
    await prisma.socialConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastSyncError: friendlyMessage },
    });
    throw new Error(friendlyMessage);
  }
}

/** Admin Dashboard's API Connections panel — aggregated per platform, org-wide. */
export async function getOrgConnectionSummary(organizationId: string) {
  const totalMembers = await prisma.member.count({ where: { organizationId, deletedAt: null } });

  return Promise.all(
    (Object.keys(PROVIDERS) as SocialPlatform[]).map(async (platform) => {
      const [connectedCount, lastSynced] = await Promise.all([
        prisma.socialConnection.count({ where: { platform, status: "CONNECTED", member: { organizationId } } }),
        prisma.socialConnection.findFirst({
          where: { platform, status: "CONNECTED", member: { organizationId } },
          orderBy: { lastSyncedAt: "desc" },
          select: { lastSyncedAt: true },
        }),
      ]);

      return {
        platform,
        label: PROVIDERS[platform].label,
        configured: isPlatformConfigured(platform),
        connectedCount,
        totalMembers,
        lastSyncedAt: lastSynced?.lastSyncedAt ?? null,
        // Social platforms don't carry GMV/commission — these stay null,
        // ready for a future commerce-platform connector to populate.
        gmvSyncedCents: null as number | null,
        commissionSyncedCents: null as number | null,
      };
    })
  );
}

/**
 * Platform Integrations panel — the full catalog shown to admins, broader
 * than getOrgConnectionSummary's 3 real rows: sign-in providers (Google/
 * Apple, Supabase-managed, no per-member record to check), Resend (already
 * wired for transactional email — status reflects real config + recent
 * send volume), connected stores (Shopify et al.), and "coming soon"
 * placeholders with no backend at all.
 */
export async function getPlatformIntegrationsCatalog(organizationId: string): Promise<IntegrationEntry[]> {
  const [memberOAuthRows, storeRows, recentEmailCount] = await Promise.all([
    getOrgConnectionSummary(organizationId),
    getOrgStoreConnectionSummary(organizationId),
    prisma.emailLog.count({
      where: { organizationId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return [
    ...memberOAuthRows.map((r): IntegrationEntry => ({ kind: "member-oauth", ...r })),
    ...storeRows.map((r): IntegrationEntry => ({ kind: "store-oauth", ...r })),
    ...AUTH_PROVIDER_ENTRIES.map((p): IntegrationEntry => ({ kind: "auth-provider", ...p, enabled: true })),
    {
      kind: "service",
      key: "resend",
      label: "Resend",
      configured: Boolean(process.env.RESEND_API_KEY),
      recentActivity: recentEmailCount,
    },
    ...COMING_SOON_ENTRIES.map((c): IntegrationEntry => ({ kind: "coming-soon", ...c })),
  ];
}
