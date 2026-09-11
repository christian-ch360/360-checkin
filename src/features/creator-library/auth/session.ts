/**
 * Shared-password session for the public Creator Library (/creator-library).
 *
 * Completely independent of the Supabase/member auth system — anyone with the
 * correct CREATOR_LIBRARY_PASSWORD gets in, no CreatorHub360 account required
 * (spec §2). The password itself is never sent to the client and never stored
 * anywhere but the environment; the browser only ever holds an opaque,
 * HMAC-signed, expiring token in an http-only cookie.
 *
 * Uses Web Crypto (globalThis.crypto.subtle) rather than node:crypto so the
 * exact same verification runs in Edge middleware and in Node server
 * actions/components. No secret material other than the password is needed —
 * the HMAC key is derived from it, so rotating CREATOR_LIBRARY_PASSWORD
 * invalidates every existing session for free.
 */

export const LIBRARY_COOKIE_NAME = "c360_library_access";

/** 7 days — matches the cookie's Max-Age and the token's embedded `exp`. */
export const LIBRARY_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const KEY_CONTEXT = "c360-creator-library.v1";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Fresh ArrayBuffer copy — Web Crypto's BufferSource params reject views over a non-ArrayBuffer backing store under strict lib types. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function getConfiguredPassword(): string | null {
  const password = process.env.CREATOR_LIBRARY_PASSWORD;
  return password && password.length > 0 ? password : null;
}

export function isLibraryAccessConfigured(): boolean {
  return getConfiguredPassword() !== null;
}

async function getSigningKey(): Promise<CryptoKey> {
  const password = getConfiguredPassword();
  if (!password) {
    throw new Error("CREATOR_LIBRARY_PASSWORD is not set — the Creator Library cannot issue or verify sessions.");
  }
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(`${KEY_CONTEXT}:${password}`)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Constant-time-ish comparison of a submitted password against the configured
 * one. Length is allowed to leak (unavoidable without hashing) but per-byte
 * timing is not.
 */
export function verifyLibraryPassword(candidate: string): boolean {
  const expected = getConfiguredPassword();
  if (!expected) return false;
  const a = encoder.encode(candidate);
  const b = encoder.encode(expected);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

type TokenPayload = { iat: number; exp: number };

export async function createLibraryToken(): Promise<string> {
  const now = Date.now();
  const payload: TokenPayload = { iat: now, exp: now + LIBRARY_SESSION_MAX_AGE_SECONDS * 1000 };
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(), toArrayBuffer(payloadBytes));
  return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/**
 * True only when `token` is a well-formed, correctly-signed, unexpired
 * library session token. Any parsing/crypto error fails closed.
 */
export async function verifyLibraryToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return false;

  try {
    const payloadBytes = base64UrlDecode(payloadPart);
    const signatureBytes = base64UrlDecode(signaturePart);
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      toArrayBuffer(signatureBytes),
      toArrayBuffer(payloadBytes),
    );
    if (!valid) return false;

    const payload = JSON.parse(decoder.decode(payloadBytes)) as Partial<TokenPayload>;
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
