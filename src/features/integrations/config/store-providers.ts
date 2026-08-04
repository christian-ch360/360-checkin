import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { StoreProvider } from "@prisma/client";

export type StoreOAuthTokenResult = { accessToken: string; refreshToken: string | null; expiresInSec: number | null };
export type StoreStatsResult = { externalAccountId: string; storeName: string | null };

export type StoreProviderConfig = {
  label: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Unlike social providers, the authorize URL is per-shop — the domain must be known before OAuth can even start. */
  buildAuthorizeUrl(shopDomain: string, redirectUri: string, state: string): string;
  exchangeCode(shopDomain: string, code: string): Promise<StoreOAuthTokenResult>;
  fetchStoreInfo(shopDomain: string, accessToken: string): Promise<StoreStatsResult>;
  /** Verifies the provider's own callback request signature — separate from this app's CSRF `state`. */
  verifyCallbackHmac(params: URLSearchParams, secret: string): boolean;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

export function isStoreProviderConfigured(provider: StoreProvider): boolean {
  const config = STORE_PROVIDERS[provider];
  return Boolean(process.env[config.clientIdEnv] && process.env[config.clientSecretEnv]);
}

const SHOP_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

/** Normalizes free-text user input ("acme", "acme.myshopify.com", "https://acme.myshopify.com/") into a bare shop domain. */
export function normalizeShopDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const domain = trimmed.includes(".") ? trimmed : `${trimmed}.myshopify.com`;
  return SHOP_DOMAIN_PATTERN.test(domain) ? domain : null;
}

// --- Shopify (Admin API OAuth) ----------------------------------------------
// Shopify's OAuth is per-shop: the authorize URL is built against the
// merchant's own *.myshopify.com domain, which must be collected from the
// user BEFORE redirecting — the one integration in this app that isn't a
// bare one-click link. Offline access tokens (the kind requested here, via
// omitting `grant_options[]=per-user`) don't expire, so there's no refresh
// flow to implement for this provider.
const shopify: StoreProviderConfig = {
  label: "Shopify",
  clientIdEnv: "SHOPIFY_CLIENT_ID",
  clientSecretEnv: "SHOPIFY_CLIENT_SECRET",
  buildAuthorizeUrl(shopDomain, redirectUri, state) {
    const params = new URLSearchParams({
      client_id: requireEnv("SHOPIFY_CLIENT_ID"),
      scope: "read_orders,read_products",
      redirect_uri: redirectUri,
      state,
    });
    return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode(shopDomain, code) {
    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: requireEnv("SHOPIFY_CLIENT_ID"),
        client_secret: requireEnv("SHOPIFY_CLIENT_SECRET"),
        code,
      }),
    });
    if (!res.ok) throw new Error(`Shopify token exchange failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: null, expiresInSec: null };
  },
  async fetchStoreInfo(shopDomain, accessToken) {
    const res = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });
    if (!res.ok) throw new Error(`Shopify shop fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { externalAccountId: String(data.shop?.id ?? shopDomain), storeName: data.shop?.name ?? null };
  },
  // Shopify signs every OAuth callback with an HMAC over the sorted query
  // string (excluding `hmac` itself), keyed by the app's client secret —
  // this proves the request actually came from Shopify, entirely separate
  // from this app's own signed `state` (which proves it came from a session
  // this app started). Both checks are required.
  verifyCallbackHmac(params, secret) {
    const provided = params.get("hmac");
    if (!provided) return false;
    const message = Array.from(params.entries())
      .filter(([key]) => key !== "hmac" && key !== "signature")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    const expected = createHmac("sha256", secret).update(message).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const providedBuf = Buffer.from(provided, "hex");
    return expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
  },
};

export const STORE_PROVIDERS: Record<StoreProvider, StoreProviderConfig> = { SHOPIFY: shopify };
