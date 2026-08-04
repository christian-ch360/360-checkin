import "server-only";

import type { SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { encryptToken, decryptToken } from "@/lib/crypto/token-cipher";
import { PROVIDERS } from "@/features/integrations/config/providers";

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

type RefreshableConnection = {
  id: string;
  accessTokenEnc: string | null;
  refreshTokenEnc: string | null;
  tokenExpiresAt: Date | null;
};

/**
 * Returns a valid, decrypted access token for the given social connection —
 * transparently refreshing and persisting a new one first if the stored
 * token is expired (or about to be) and the platform supports refresh. This
 * is the one path where a connection can legitimately need reconnecting: if
 * refresh itself fails, the row is marked ERROR and the error rethrown.
 */
export async function ensureFreshAccessToken(platform: SocialPlatform, connection: RefreshableConnection): Promise<string> {
  if (!connection.accessTokenEnc) throw new Error("Not connected");
  const provider = PROVIDERS[platform];
  const needsRefresh =
    connection.tokenExpiresAt != null && connection.tokenExpiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS;

  if (!needsRefresh || !provider.refreshToken || !connection.refreshTokenEnc) {
    return decryptToken(connection.accessTokenEnc);
  }

  try {
    const refreshed = await provider.refreshToken(decryptToken(connection.refreshTokenEnc));
    await prisma.socialConnection.update({
      where: { id: connection.id },
      data: {
        accessTokenEnc: encryptToken(refreshed.accessToken),
        refreshTokenEnc: refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : connection.refreshTokenEnc,
        tokenExpiresAt: refreshed.expiresInSec ? new Date(Date.now() + refreshed.expiresInSec * 1000) : null,
      },
    });
    return refreshed.accessToken;
  } catch (err) {
    await prisma.socialConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastSyncError: err instanceof Error ? `Token refresh failed: ${err.message}` : "Token refresh failed" },
    });
    throw err;
  }
}

/**
 * Store-connection equivalent. A no-op passthrough today — Shopify's offline
 * access tokens don't expire — but kept symmetric with the social helper so
 * a future store provider that does rotate tokens doesn't need new call
 * sites, just a `refreshToken` implementation on its provider config.
 */
export async function ensureFreshStoreAccessToken(connection: RefreshableConnection): Promise<string> {
  if (!connection.accessTokenEnc) throw new Error("Not connected");
  return decryptToken(connection.accessTokenEnc);
}
