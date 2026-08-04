import type { RevenueChannel } from "@prisma/client";

export const CHANNEL_LABELS: Record<RevenueChannel, string> = {
  BRAND_DEALS: "Brand Deals",
  TIKTOK_SHOP: "TikTok Shop",
  ONLINE_STORE: "Online Store",
  AFFILIATE: "Affiliate Revenue",
  UGC_PROJECTS: "UGC Projects",
  REFERRALS: "Referrals",
  OTHER: "Other",
};

/** The 6 channels requested for the breakdown UI — excludes OTHER, which is surfaced separately. */
export const NAMED_CHANNELS: RevenueChannel[] = [
  "BRAND_DEALS",
  "TIKTOK_SHOP",
  "ONLINE_STORE",
  "AFFILIATE",
  "UGC_PROJECTS",
  "REFERRALS",
];
