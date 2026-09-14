import type {
  CampaignBudgetFlexibility,
  CampaignDeliverableType,
  CampaignGoal,
  CampaignLocationScope,
  CampaignRequestType,
  DesiredReachTier,
} from "@prisma/client";

/**
 * Labels, ordering, and zod-friendly value arrays for every enum on
 * CampaignRequest/CampaignCandidate — the single source of truth the
 * campaign builder UI, the validation schema, and the summary/review step
 * all read from, mirroring the `content-categories.ts` pattern.
 */

export const campaignRequestTypeValues = [
  "PRODUCT_LAUNCH",
  "BRAND_AWARENESS",
  "UGC_CAMPAIGN",
  "SOCIAL_MEDIA_CAMPAIGN",
  "INFLUENCER_PARTNERSHIP",
  "EVENT_PROMOTION",
  "AFFILIATE_CAMPAIGN",
  "AMBASSADOR_PROGRAM",
  "OTHER",
] as const;

export const CAMPAIGN_TYPE_LABELS: Record<CampaignRequestType, string> = {
  PRODUCT_LAUNCH: "Product Launch",
  BRAND_AWARENESS: "Brand Awareness",
  UGC_CAMPAIGN: "UGC Campaign",
  SOCIAL_MEDIA_CAMPAIGN: "Social Media Campaign",
  INFLUENCER_PARTNERSHIP: "Influencer Partnership",
  EVENT_PROMOTION: "Event Promotion",
  AFFILIATE_CAMPAIGN: "Affiliate Campaign",
  AMBASSADOR_PROGRAM: "Ambassador Program",
  OTHER: "Other",
};

export const campaignGoalValues = [
  "BRAND_AWARENESS",
  "REACH",
  "ENGAGEMENT",
  "CONTENT_CREATION",
  "WEBSITE_TRAFFIC",
  "PRODUCT_SALES",
  "APP_DOWNLOADS",
  "EVENT_ATTENDANCE",
] as const;

export const CAMPAIGN_GOAL_LABELS: Record<CampaignGoal, string> = {
  BRAND_AWARENESS: "Brand Awareness",
  REACH: "Reach",
  ENGAGEMENT: "Engagement",
  CONTENT_CREATION: "Content Creation",
  WEBSITE_TRAFFIC: "Website Traffic",
  PRODUCT_SALES: "Product Sales",
  APP_DOWNLOADS: "App Downloads",
  EVENT_ATTENDANCE: "Event Attendance",
};

export const desiredReachTierValues = ["NANO", "MICRO", "MID_TIER", "MACRO", "MEGA"] as const;

export const DESIRED_REACH_TIER_LABELS: Record<DesiredReachTier, string> = {
  NANO: "Nano",
  MICRO: "Micro",
  MID_TIER: "Mid-Tier",
  MACRO: "Macro",
  MEGA: "Mega",
};

/** Industry-standard follower ranges backing each desired reach tier — used
 * to seed a Modash discovery query's follower bounds later; purely additive
 * to any explicit min/max the brand sets. */
export const DESIRED_REACH_TIER_RANGES: Record<DesiredReachTier, { min: number; max: number | null }> = {
  NANO: { min: 1_000, max: 10_000 },
  MICRO: { min: 10_000, max: 50_000 },
  MID_TIER: { min: 50_000, max: 500_000 },
  MACRO: { min: 500_000, max: 1_000_000 },
  MEGA: { min: 1_000_000, max: null },
};

export const campaignLocationScopeValues = ["WORLDWIDE", "COUNTRY", "STATE", "CITY"] as const;

export const CAMPAIGN_LOCATION_SCOPE_LABELS: Record<CampaignLocationScope, string> = {
  WORLDWIDE: "Worldwide",
  COUNTRY: "Country",
  STATE: "State",
  CITY: "City",
};

export const campaignBudgetFlexibilityValues = ["FIXED", "SOME_FLEXIBILITY", "FLEXIBLE"] as const;

export const CAMPAIGN_BUDGET_FLEXIBILITY_LABELS: Record<CampaignBudgetFlexibility, string> = {
  FIXED: "Fixed",
  SOME_FLEXIBILITY: "Some Flexibility",
  FLEXIBLE: "Flexible",
};

export const campaignDeliverableTypeValues = [
  "INSTAGRAM_FEED_POST",
  "INSTAGRAM_REEL",
  "INSTAGRAM_STORY",
  "TIKTOK_VIDEO",
  "TIKTOK_STORY",
  "YOUTUBE_SHORT",
  "YOUTUBE_DEDICATED_VIDEO",
  "YOUTUBE_INTEGRATION",
] as const;

export const CAMPAIGN_DELIVERABLE_LABELS: Record<CampaignDeliverableType, string> = {
  INSTAGRAM_FEED_POST: "Feed Post",
  INSTAGRAM_REEL: "Reel",
  INSTAGRAM_STORY: "Story",
  TIKTOK_VIDEO: "TikTok Video",
  TIKTOK_STORY: "TikTok Story",
  YOUTUBE_SHORT: "Short",
  YOUTUBE_DEDICATED_VIDEO: "Dedicated Video",
  YOUTUBE_INTEGRATION: "Integration",
};

/** Deliverables grouped by platform for the Step 4 UI. */
export const CAMPAIGN_DELIVERABLE_GROUPS: { platform: string; types: CampaignDeliverableType[] }[] = [
  { platform: "Instagram", types: ["INSTAGRAM_FEED_POST", "INSTAGRAM_REEL", "INSTAGRAM_STORY"] },
  { platform: "TikTok", types: ["TIKTOK_VIDEO", "TIKTOK_STORY"] },
  { platform: "YouTube", types: ["YOUTUBE_SHORT", "YOUTUBE_DEDICATED_VIDEO", "YOUTUBE_INTEGRATION"] },
];
