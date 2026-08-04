/**
 * Single source of truth for turning whatever a user typed into a social
 * field (bare username, @handle, bare domain, or full URL) into one
 * canonical, safe-to-link URL. Used both to normalize values before they're
 * stored (so every render site can trust what's in the database) and to
 * validate input at the zod layer — a value is only accepted if parsing it
 * succeeds.
 */

const PROTOCOL_RE = /^https?:\/\//i;
const HANDLE_RE = /^[a-zA-Z0-9._-]{1,60}$/;

type ParsedSocialInput = { url: string; handle: string };

/** Strips protocol, a known domain prefix, a leading "@", and anything after the handle (path/query/hash). */
function extractHandle(value: string, domainRe: RegExp): string {
  let v = value.trim().replace(PROTOCOL_RE, "");
  v = v.replace(domainRe, "");
  v = v.replace(/^@/, "");
  v = v.split(/[/?#]/)[0] ?? "";
  return v.trim();
}

function parse(value: string | null | undefined, domainRe: RegExp, buildUrl: (handle: string) => string): ParsedSocialInput | null {
  if (!value?.trim()) return null;
  const handle = extractHandle(value, domainRe);
  if (!handle || !HANDLE_RE.test(handle)) return null;
  return { url: buildUrl(handle), handle };
}

const INSTAGRAM_DOMAIN_RE = /^(www\.)?instagram\.com\//i;
const TIKTOK_DOMAIN_RE = /^(www\.)?tiktok\.com\//i;
const LINKEDIN_DOMAIN_RE = /^(www\.)?linkedin\.com\/(in\/)?/i;

export function parseInstagramInput(value: string | null | undefined): ParsedSocialInput | null {
  return parse(value, INSTAGRAM_DOMAIN_RE, (handle) => `https://instagram.com/${handle}`);
}

export function parseTiktokInput(value: string | null | undefined): ParsedSocialInput | null {
  return parse(value, TIKTOK_DOMAIN_RE, (handle) => `https://www.tiktok.com/@${handle}`);
}

export function parseLinkedinInput(value: string | null | undefined): ParsedSocialInput | null {
  return parse(value, LINKEDIN_DOMAIN_RE, (handle) => `https://linkedin.com/in/${handle}`);
}

/** YouTube handles are ambiguous (handle vs. channel ID vs. custom URL) — only a URL (with or without protocol) is accepted, never a bare word. */
export function parseYoutubeInput(value: string | null | undefined): ParsedSocialInput | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (PROTOCOL_RE.test(trimmed)) return { url: trimmed, handle: trimmed };
  if (/^(www\.)?youtube\.com\//i.test(trimmed)) return { url: `https://${trimmed}`, handle: trimmed };
  return null;
}

/** Normalized URL, or null if empty/unparseable. Safe to use directly as an `href`. */
export function instagramUrl(value: string | null | undefined): string | null {
  return parseInstagramInput(value)?.url ?? null;
}

export function tiktokUrl(value: string | null | undefined): string | null {
  return parseTiktokInput(value)?.url ?? null;
}

export function youtubeUrl(value: string | null | undefined): string | null {
  return parseYoutubeInput(value)?.url ?? null;
}

export function linkedinUrl(value: string | null | undefined): string | null {
  return parseLinkedinInput(value)?.url ?? null;
}
