/**
 * Pure normalization helpers for the Creator Library CSV importer (spec §5).
 * No DB, no side effects — unit-tested in tests/unit/creator-library-normalize.test.ts.
 */

import { instagramUrl, tiktokUrl } from "@/lib/utils/social-links";

/** Trim + collapse internal whitespace. Empty → null. */
export function normalizeName(raw: string | null | undefined): string | null {
  const value = (raw ?? "").replace(/\s+/g, " ").trim();
  return value.length > 0 ? value : null;
}

/**
 * A bare social handle, however it was written: `@name`, `name`, or a full
 * profile URL (`https://instagram.com/name`, `tiktok.com/@name?lang=en`).
 * Case is preserved for display; callers compare case-insensitively.
 */
const NO_ACCOUNT_RE = /^(n\s*\/?\s*a|none|null|-{1,2}|—|no\s+\w+\s+account|not?\s+applicable)$/i;

export function normalizeHandle(raw: string | null | undefined): string | null {
  let value = (raw ?? "").trim();
  if (!value) return null;
  if (NO_ACCOUNT_RE.test(value)) return null;

  const urlMatch = value.match(
    /(?:instagram\.com|tiktok\.com|youtube\.com|twitter\.com|x\.com|facebook\.com)\/@?([A-Za-z0-9._-]+)/i,
  );
  if (urlMatch) value = urlMatch[1];

  value = value.replace(/^@+/, "").replace(/[?/#].*$/, "").trim();
  if (!value || NO_ACCOUNT_RE.test(value) || /^(no\s|null$)/i.test(value)) return null;
  return value.length > 0 ? value : null;
}

/** Lowercased, punctuation-stripped handle for matching (`_bblasian` === `bblasian`). */
export function handleMatchKey(raw: string | null | undefined): string | null {
  const handle = normalizeHandle(raw);
  return handle ? handle.toLowerCase().replace(/[._-]/g, "") : null;
}

/**
 * Follower/subscriber count from any of: `1200000`, `1,200,000`, `100K`,
 * `1.2M`, `1.2 m`, `12k followers`. Returns a non-negative integer, or null
 * for blank / non-numeric / a clear scraping artifact (`0`, `1`).
 */
export function parseFollowerCount(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 1 ? Math.round(raw) : null;
  }

  const cleaned = raw.trim().toLowerCase().replace(/followers?|subscribers?|subs?/g, "").trim();
  if (!cleaned || cleaned === "—" || cleaned === "-" || cleaned === "n/a" || cleaned === "na") return null;

  const match = cleaned.match(/^([\d,]+(?:\.\d+)?)\s*([km])?$/);
  if (!match) return null;

  const base = Number.parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(base) || base < 0) return null;

  const multiplier = match[2] === "k" ? 1_000 : match[2] === "m" ? 1_000_000 : 1;
  const value = Math.round(base * multiplier);
  return value > 1 ? value : null;
}

/** Format an integer back to a human-friendly display string for previews. */
export function formatFollowerInput(value: number | null): string {
  return value == null ? "" : value.toLocaleString("en-US");
}

/** e-mail normalization: trim + lowercase. Rejects anything without an `@x.y`. */
export function normalizeEmail(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

/** Phone: keep digits, leading `+`. Empty → null (never validated further). */
export function normalizePhone(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().replace(/(?!^\+)[^\d]/g, "");
  return value.replace(/\D/g, "").length >= 7 ? value : null;
}

/** Canonical Instagram profile URL from a handle or URL. */
export function instagramUrlFromInput(handleOrUrl: string | null | undefined): string | null {
  const handle = normalizeHandle(handleOrUrl);
  return handle ? instagramUrl(handle) : null;
}

/** Canonical TikTok profile URL from a handle or URL. */
export function tiktokUrlFromInput(handleOrUrl: string | null | undefined): string | null {
  const handle = normalizeHandle(handleOrUrl);
  return handle ? tiktokUrl(`@${handle}`) : null;
}

/**
 * YouTube: the shared parseYoutubeInput only accepts URLs, so build the
 * `@handle` form here when given a bare handle; pass a real URL straight
 * through (protocol added if missing).
 */
export function youtubeUrlFromInput(handleOrUrl: string | null | undefined): string | null {
  const value = (handleOrUrl ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(www\.)?youtube\.com\//i.test(value)) return `https://${value}`;
  const handle = normalizeHandle(value);
  return handle ? `https://youtube.com/@${handle}` : null;
}

/** Generic website URL — add protocol if missing, reject non-URLish input. */
export function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return url.hostname.includes(".") ? url.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}
