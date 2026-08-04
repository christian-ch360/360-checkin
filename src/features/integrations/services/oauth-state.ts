import "server-only";

import { createHmac, randomBytes } from "crypto";

function getSecret() {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!secret) throw new Error("INTEGRATIONS_ENCRYPTION_KEY environment variable is not set");
  return secret;
}

/**
 * Signed CSRF state for the OAuth connect → callback round trip. Carries the
 * memberId so the callback route can trust who initiated the flow without
 * depending on session-cookie continuity across the third-party redirect.
 * `platform` is typed as a plain string (rather than SocialPlatform) so both
 * the social (SocialPlatform) and store (StoreProvider) connect flows can
 * share this one implementation.
 */
export function signOAuthState(memberId: string, platform: string): string {
  const nonce = randomBytes(8).toString("hex");
  const payload = Buffer.from(JSON.stringify({ memberId, platform, nonce })).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 24);
  return `${payload}.${signature}`;
}

export function verifyOAuthState(state: string): { memberId: string; platform: string } | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 24);
  if (expected !== signature) return null;

  try {
    const { memberId, platform } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof memberId !== "string" || typeof platform !== "string") return null;
    return { memberId, platform };
  } catch {
    return null;
  }
}
