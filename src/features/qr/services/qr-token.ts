import "server-only";

import { createHmac, randomBytes } from "crypto";
import type { QRAssetType } from "@prisma/client";

function getSecret() {
  const secret = process.env.QR_SECRET;
  if (!secret) {
    throw new Error("QR_SECRET environment variable is not set");
  }
  return secret;
}

/**
 * Generates a signed, opaque QR token: <type>.<random>.<hmac>
 * The HMAC lets scanners verify the token was minted by this server
 * without a DB round trip, before looking up the underlying entity.
 */
export function generateQRToken(type: QRAssetType): string {
  const random = randomBytes(16).toString("hex");
  const payload = `${type}.${random}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 24);
  return `${payload}.${signature}`;
}

export function verifyQRToken(token: string): { type: QRAssetType; valid: boolean } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [type, random, signature] = parts;
  const payload = `${type}.${random}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 24);

  return {
    type: type as QRAssetType,
    valid: expected === signature,
  };
}
