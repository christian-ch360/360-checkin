import "server-only";

import { headers } from "next/headers";

/**
 * headers() only resolves inside an actual request (Server Action / Route
 * Handler) — background work has no request to read, so these return null
 * rather than throwing. Used anywhere a nullable ipAddress/userAgent column
 * needs to be "captured where available" (AuditLog, LegalAcceptance,
 * MembershipApplicationLegalAcceptance).
 */
export async function getRequestIp(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || null;
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

export async function getRequestUserAgent(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("user-agent");
  } catch {
    return null;
  }
}
