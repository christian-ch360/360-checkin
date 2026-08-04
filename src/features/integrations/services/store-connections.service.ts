import "server-only";

import type { StoreProvider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "@/lib/crypto/token-cipher";
import { STORE_PROVIDERS, isStoreProviderConfigured } from "@/features/integrations/config/store-providers";
import { signOAuthState } from "@/features/integrations/services/oauth-state";
import { ensureFreshStoreAccessToken } from "@/features/integrations/services/token-refresh.service";

function redirectUriFor(provider: StoreProvider): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/integrations/store/${provider.toLowerCase()}/callback`;
}

/** Returns null when the provider has no credentials configured — the caller renders "Not configured". */
export function buildStoreAuthorizeUrl(provider: StoreProvider, memberId: string, shopDomain: string): string | null {
  if (!isStoreProviderConfigured(provider)) return null;
  const state = signOAuthState(memberId, provider);
  return STORE_PROVIDERS[provider].buildAuthorizeUrl(shopDomain, redirectUriFor(provider), state);
}

export async function exchangeAndStoreStoreConnection(provider: StoreProvider, memberId: string, shopDomain: string, code: string) {
  const config = STORE_PROVIDERS[provider];
  const token = await config.exchangeCode(shopDomain, code);
  const info = await config.fetchStoreInfo(shopDomain, token.accessToken);

  await prisma.storeConnection.upsert({
    where: { memberId_provider: { memberId, provider } },
    update: {
      status: "CONNECTED",
      storeName: info.storeName,
      storeDomain: shopDomain,
      externalAccountId: info.externalAccountId,
      accessTokenEnc: encryptToken(token.accessToken),
      refreshTokenEnc: token.refreshToken ? encryptToken(token.refreshToken) : null,
      tokenExpiresAt: token.expiresInSec ? new Date(Date.now() + token.expiresInSec * 1000) : null,
      revenueSyncStatus: "idle",
      lastSyncedAt: new Date(),
      lastSyncError: null,
    },
    create: {
      memberId,
      provider,
      status: "CONNECTED",
      storeName: info.storeName,
      storeDomain: shopDomain,
      externalAccountId: info.externalAccountId,
      accessTokenEnc: encryptToken(token.accessToken),
      refreshTokenEnc: token.refreshToken ? encryptToken(token.refreshToken) : null,
      tokenExpiresAt: token.expiresInSec ? new Date(Date.now() + token.expiresInSec * 1000) : null,
      revenueSyncStatus: "idle",
      lastSyncedAt: new Date(),
    },
  });
}

export async function getStoreConnectionsForMember(memberId: string) {
  const connections = await prisma.storeConnection.findMany({ where: { memberId } });
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  return (Object.keys(STORE_PROVIDERS) as StoreProvider[]).map((provider) => {
    const connection = byProvider.get(provider);
    return {
      provider,
      label: STORE_PROVIDERS[provider].label,
      configured: isStoreProviderConfigured(provider),
      status: connection?.status ?? "DISCONNECTED",
      storeName: connection?.storeName ?? null,
      storeDomain: connection?.storeDomain ?? null,
      revenueSyncStatus: connection?.revenueSyncStatus ?? null,
      lastSyncedAt: connection?.lastSyncedAt ?? null,
      lastSyncError: connection?.lastSyncError ?? null,
    };
  });
}

export async function disconnectStoreConnection(memberId: string, provider: StoreProvider) {
  await prisma.storeConnection.updateMany({
    where: { memberId, provider },
    data: { status: "DISCONNECTED", accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null, revenueSyncStatus: null },
  });
}

export async function syncStoreConnection(memberId: string, provider: StoreProvider) {
  const connection = await prisma.storeConnection.findUnique({ where: { memberId_provider: { memberId, provider } } });
  if (!connection?.accessTokenEnc || !connection.storeDomain) throw new Error("Not connected");

  const config = STORE_PROVIDERS[provider];
  try {
    const accessToken = await ensureFreshStoreAccessToken(connection);
    const info = await config.fetchStoreInfo(connection.storeDomain, accessToken);
    await prisma.storeConnection.update({
      where: { id: connection.id },
      data: { status: "CONNECTED", storeName: info.storeName, revenueSyncStatus: "idle", lastSyncedAt: new Date(), lastSyncError: null },
    });
  } catch (err) {
    await prisma.storeConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", revenueSyncStatus: "error", lastSyncError: err instanceof Error ? err.message : "Sync failed" },
    });
    throw err;
  }
}

/** Admin Dashboard's Platform Integrations panel — aggregated per store provider, org-wide. */
export async function getOrgStoreConnectionSummary(organizationId: string) {
  const totalMembers = await prisma.member.count({ where: { organizationId, deletedAt: null } });

  return Promise.all(
    (Object.keys(STORE_PROVIDERS) as StoreProvider[]).map(async (provider) => {
      const [connectedCount, lastSynced] = await Promise.all([
        prisma.storeConnection.count({ where: { provider, status: "CONNECTED", member: { organizationId } } }),
        prisma.storeConnection.findFirst({
          where: { provider, status: "CONNECTED", member: { organizationId } },
          orderBy: { lastSyncedAt: "desc" },
          select: { lastSyncedAt: true },
        }),
      ]);

      return {
        provider,
        label: STORE_PROVIDERS[provider].label,
        configured: isStoreProviderConfigured(provider),
        connectedCount,
        totalMembers,
        lastSyncedAt: lastSynced?.lastSyncedAt ?? null,
        gmvSyncedCents: null as number | null,
        commissionSyncedCents: null as number | null,
      };
    })
  );
}
