import type { SocialPlatform, StoreProvider } from "@prisma/client";

/**
 * The Platform Integrations panel shows more than the 3 real OAuth-backed
 * SocialPlatform rows — sign-in providers, wired-but-unrelated services, and
 * marketing "coming soon" placeholders. Decoupled from `PROVIDERS` in
 * config/providers.ts (which is strictly typed to real, working OAuth
 * connectors) so a placeholder never has to fake-implement that interface.
 */
export type IntegrationEntry =
  | {
      kind: "member-oauth";
      platform: SocialPlatform;
      label: string;
      configured: boolean;
      connectedCount: number;
      totalMembers: number;
      lastSyncedAt: Date | null;
      gmvSyncedCents: number | null;
      commissionSyncedCents: number | null;
    }
  | {
      kind: "store-oauth";
      provider: StoreProvider;
      label: string;
      configured: boolean;
      connectedCount: number;
      totalMembers: number;
      lastSyncedAt: Date | null;
      gmvSyncedCents: number | null;
      commissionSyncedCents: number | null;
    }
  | { kind: "auth-provider"; key: string; label: string; enabled: boolean }
  | { kind: "service"; key: string; label: string; configured: boolean; recentActivity: number }
  | { kind: "coming-soon"; key: string; label: string };

// Google/Apple are Supabase-managed sign-in providers (see
// src/features/auth/config/oauth-providers.tsx) — always "enabled" from the
// app's point of view since there's no per-member connection record to
// track for them, just a project-level Supabase Auth setting.
export const AUTH_PROVIDER_ENTRIES: { key: string; label: string }[] = [
  { key: "google", label: "Google" },
  { key: "apple", label: "Apple" },
];

// No backend exists for these yet — shown so the panel reads as a real
// roadmap, not just "whatever happens to be wired up today." Shopify moved
// out of this list once StoreConnection/StoreProvider shipped — it's a real
// "store-oauth" row now, see getPlatformIntegrationsCatalog.
export const COMING_SOON_ENTRIES: { key: string; label: string }[] = [
  { key: "tiktok-shop", label: "TikTok Shop" },
  { key: "stripe", label: "Stripe" },
];
