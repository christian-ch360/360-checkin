import { z } from "zod";

/**
 * The structured shape OpenAI returns for one creator candidate (spec §9).
 * `campaignIntelligenceResponseSchema` is both: (a) compiled to a JSON
 * Schema for OpenAI's Structured Outputs (see `analysisJsonSchema` below),
 * and (b) the zod validator every response is re-checked against before
 * anything is saved — OpenAI's `strict: true` mode makes malformed JSON
 * unlikely, but the app never trusts an external API's output un-validated.
 */
export const campaignCandidateAnalysisSchema = z.object({
  creatorId: z.string(),
  matchScore: z.number().int().min(0).max(100),
  matchReasoning: z.string().min(1).max(2000),
  strengths: z.array(z.string().min(1).max(200)).max(10),
  concerns: z.array(z.string().min(1).max(200)).max(10),
  audienceFit: z.number().int().min(0).max(100),
  contentFit: z.number().int().min(0).max(100),
  platformFit: z.number().int().min(0).max(100),
  budgetFit: z.number().int().min(0).max(100),
  recommendedPayout: z.number().min(0).max(10_000_000),
  minimumSuggestedPayout: z.number().min(0).max(10_000_000),
  maximumSuggestedPayout: z.number().min(0).max(10_000_000),
  budgetReasoning: z.string().min(1).max(1000),
});

export type CampaignCandidateAnalysis = z.infer<typeof campaignCandidateAnalysisSchema>;

export const campaignIntelligenceResponseSchema = z.object({
  candidates: z.array(campaignCandidateAnalysisSchema).max(100),
});

export type CampaignIntelligenceResponse = z.infer<typeof campaignIntelligenceResponseSchema>;

/**
 * The JSON Schema counterpart of `campaignIntelligenceResponseSchema`, for
 * OpenAI's `response_format: json_schema` (OpenAI's Structured Outputs
 * currently requires a hand-authored JSON Schema — it cannot ingest a zod
 * schema directly). Keep this in lockstep with the zod schema above; the
 * zod schema is still what actually gets enforced app-side.
 */
export const campaignIntelligenceJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          creatorId: { type: "string" },
          matchScore: { type: "integer", minimum: 0, maximum: 100 },
          matchReasoning: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          concerns: { type: "array", items: { type: "string" } },
          audienceFit: { type: "integer", minimum: 0, maximum: 100 },
          contentFit: { type: "integer", minimum: 0, maximum: 100 },
          platformFit: { type: "integer", minimum: 0, maximum: 100 },
          budgetFit: { type: "integer", minimum: 0, maximum: 100 },
          recommendedPayout: { type: "number" },
          minimumSuggestedPayout: { type: "number" },
          maximumSuggestedPayout: { type: "number" },
          budgetReasoning: { type: "string" },
        },
        required: [
          "creatorId",
          "matchScore",
          "matchReasoning",
          "strengths",
          "concerns",
          "audienceFit",
          "contentFit",
          "platformFit",
          "budgetFit",
          "recommendedPayout",
          "minimumSuggestedPayout",
          "maximumSuggestedPayout",
          "budgetReasoning",
        ],
      },
    },
  },
  required: ["candidates"],
} as const;

/** What the campaign-intelligence pipeline needs to know about the campaign. */
export type CampaignIntelligenceInput = {
  campaignName: string;
  campaignType: string;
  description: string | null;
  goals: string[];
  objective: string | null;
  categories: string[];
  platforms: string[];
  totalBudget: number | null;
  preferredBudgetPerCreator: number | null;
  budgetFlexibility: string | null;
  creatorCount: number | null;
  deliverables: string[];
};

/** One Modash-enriched candidate, cross-referenced with our own library data. */
export type CampaignIntelligenceCandidateInput = {
  creatorId: string;
  name: string;
  categories: string[];
  platforms: string[];
  totalFollowers: number;
  engagementRate: number | null;
  location: string | null;
};
