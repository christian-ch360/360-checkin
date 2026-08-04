import "server-only";

/**
 * Camera scanners decode whatever text is embedded in the QR image. Member
 * badges embed a full scan URL (see src/app/api/qr/[token]/route.ts), not
 * the bare signed token, so every scan consumer needs to normalize before
 * calling resolveQRToken. Bare tokens (already the right shape) pass through
 * unchanged.
 */
export function extractQrToken(raw: string): string {
  const trimmed = raw.trim();

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? trimmed;
  } catch {
    return trimmed;
  }
}
