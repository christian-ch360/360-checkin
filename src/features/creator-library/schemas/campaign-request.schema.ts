import { z } from "zod";
import { contentCategoryValues } from "@/features/members/constants/content-categories";
import {
  campaignBudgetFlexibilityValues,
  campaignDeliverableTypeValues,
  campaignGoalValues,
  campaignLocationScopeValues,
  campaignRequestTypeValues,
  desiredReachTierValues,
} from "@/features/creator-library/config/campaign-config";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const optionalUrl = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => {
    const v = (value ?? "").trim();
    if (!v) return null;
    const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      return new URL(withProtocol).toString().replace(/\/$/, "");
    } catch {
      return null;
    }
  });

const optionalWholeNumber = (max: number, message: string) =>
  z
    .union([z.number(), z.string()])
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .transform((value) => (value === "" || value == null ? null : Number(value)))
    .refine((value) => value === null || (Number.isFinite(value) && value >= 0 && value <= max), { message })
    .transform((value) => (value === null ? null : Math.round(value)));

const optionalMoney = (max: number, message: string) =>
  z
    .union([z.number(), z.string()])
    .transform((value) => (typeof value === "string" ? value.replace(/[$,\s]/g, "") : value))
    .transform((value) => (value === "" || value == null ? null : Number(value)))
    .refine((value) => value === null || (Number.isFinite(value) && value >= 0 && value <= max), { message })
    .transform((value) => (value === null ? null : Math.round(value * 100) / 100));

/**
 * The full 6-step campaign builder payload, validated once at final submit
 * ("Find My Creators") — the wizard itself is client-state-only across
 * steps, so there's a single schema rather than one per step. Every field
 * beyond `campaignName`/`campaignType` is optional at the schema level to
 * match the Prisma model's nullability; the UI enforces which steps feel
 * "required" for a good campaign, not the database.
 */
export const campaignRequestSchema = z.object({
  // Step 1 — Basics
  campaignName: z.string().trim().min(1, "Give the campaign a name.").max(160),
  brandName: optionalText(160),
  brandWebsite: optionalUrl,
  campaignType: z.enum(campaignRequestTypeValues, { error: "Choose a campaign type." }),
  description: optionalText(4000),

  // Contact — how the team reaches back; there is no brand-facing status
  // page, so this is the only way CreatorHub360 can follow up.
  contactName: optionalText(160),
  contactEmail: z.string().trim().min(1, "Add an email so we can reach you.").email("Enter a valid email address."),
  contactPhone: optionalText(40),
  timeline: optionalText(200),

  // Step 2 — Goals
  goals: z.array(z.enum(campaignGoalValues)).max(campaignGoalValues.length),
  objective: optionalText(1000),

  // Step 3 — Creator requirements
  categories: z.array(z.enum(contentCategoryValues)).max(contentCategoryValues.length),
  platforms: z.array(z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE"])).max(3),
  reachTiers: z.array(z.enum(desiredReachTierValues)).max(desiredReachTierValues.length),
  minimumFollowers: optionalWholeNumber(1_000_000_000, "Enter a whole number of followers."),
  maximumFollowers: optionalWholeNumber(1_000_000_000, "Enter a whole number of followers."),
  locationScope: z.enum(campaignLocationScopeValues),
  country: optionalText(80),
  state: optionalText(80),
  city: optionalText(120),

  // Step 4 — Deliverables
  deliverables: z.array(z.enum(campaignDeliverableTypeValues)).max(campaignDeliverableTypeValues.length),
  creatorCount: optionalWholeNumber(10_000, "Enter a whole number of creators."),

  // Step 5 — Budget
  totalBudget: optionalMoney(100_000_000, "Enter a valid budget amount."),
  preferredBudgetPerCreator: optionalMoney(10_000_000, "Enter a valid amount."),
  budgetFlexibility: z.enum(campaignBudgetFlexibilityValues).nullable().optional().transform((v) => v ?? null),
});

/** Pre-parse shape the builder's client state matches (numbers may arrive as strings). */
export type CampaignRequestInput = z.input<typeof campaignRequestSchema>;
/** Post-parse shape used to write the CampaignRequest row. */
export type CampaignRequestParsed = z.output<typeof campaignRequestSchema>;

export const EMPTY_CAMPAIGN_REQUEST_INPUT: CampaignRequestInput = {
  campaignName: "",
  brandName: "",
  brandWebsite: "",
  campaignType: "OTHER",
  description: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  timeline: "",
  goals: [],
  objective: "",
  categories: [],
  platforms: [],
  reachTiers: [],
  minimumFollowers: "",
  maximumFollowers: "",
  locationScope: "WORLDWIDE",
  country: "",
  state: "",
  city: "",
  deliverables: [],
  creatorCount: "",
  totalBudget: "",
  preferredBudgetPerCreator: "",
  budgetFlexibility: null,
};
