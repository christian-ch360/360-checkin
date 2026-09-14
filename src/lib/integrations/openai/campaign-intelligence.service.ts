import "server-only";
import { createStructuredCompletion, isOpenAIConfigured } from "@/lib/integrations/openai/openai-client";
import {
  campaignIntelligenceJsonSchema,
  campaignIntelligenceResponseSchema,
  type CampaignIntelligenceCandidateInput,
  type CampaignIntelligenceInput,
  type CampaignIntelligenceResponse,
} from "@/lib/integrations/openai/campaign-intelligence.types";

export { isOpenAIConfigured };

/**
 * Campaign Requirements analysis + AI Creator Matching + Payout
 * Recommendations (spec §6-9), in one structured call: given the campaign's
 * requirements and a batch of Modash-enriched, Creator-Library-matched
 * candidates, OpenAI returns a match score, reasoning, strengths/concerns,
 * and a payout recommendation *per candidate*. The response is re-validated
 * against `campaignIntelligenceResponseSchema` before the caller
 * (`campaign-intelligence.service.ts` in features/creator-library) ever
 * writes it to the database — an external API's output is never trusted
 * un-validated, structured outputs or not.
 */
export async function analyzeCampaignCandidates(
  campaign: CampaignIntelligenceInput,
  candidates: CampaignIntelligenceCandidateInput[],
): Promise<{ ok: true; data: CampaignIntelligenceResponse } | { ok: false; error: string }> {
  if (!isOpenAIConfigured()) {
    return { ok: false, error: "OpenAI is not configured — set OPENAI_API_KEY to enable campaign intelligence." };
  }
  if (candidates.length === 0) {
    return { ok: true, data: { candidates: [] } };
  }

  const result = await createStructuredCompletion<{ candidates: unknown[] }>({
    systemPrompt: [
      "You are CreatorHub360's campaign intelligence analyst.",
      "You evaluate creator candidates against a brand's campaign requirements and produce an honest, evidence-based match score, a short reasoning statement, concrete strengths and concerns, and a fair recommended payout.",
      "Payout recommendations must respect the campaign's total budget and creator count — never suggest a payout that would make the campaign impossible to fund.",
      "Be specific and grounded in the data provided. Never invent facts about a creator that weren't given to you.",
    ].join(" "),
    userPrompt: buildAnalysisPrompt(campaign, candidates),
    schemaName: "campaign_candidate_analysis",
    schema: campaignIntelligenceJsonSchema,
  });

  if (!result.ok) return result;

  const parsed = campaignIntelligenceResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: "OpenAI returned an unexpected response shape." };
  }
  return { ok: true, data: parsed.data };
}

function buildAnalysisPrompt(campaign: CampaignIntelligenceInput, candidates: CampaignIntelligenceCandidateInput[]): string {
  return JSON.stringify(
    {
      campaign: {
        name: campaign.campaignName,
        type: campaign.campaignType,
        description: campaign.description,
        goals: campaign.goals,
        objective: campaign.objective,
        targetCategories: campaign.categories,
        targetPlatforms: campaign.platforms,
        deliverables: campaign.deliverables,
        creatorsNeeded: campaign.creatorCount,
        totalBudget: campaign.totalBudget,
        preferredBudgetPerCreator: campaign.preferredBudgetPerCreator,
        budgetFlexibility: campaign.budgetFlexibility,
      },
      candidates: candidates.map((c) => ({
        creatorId: c.creatorId,
        name: c.name,
        categories: c.categories,
        platforms: c.platforms,
        totalFollowers: c.totalFollowers,
        engagementRate: c.engagementRate,
        location: c.location,
      })),
      instructions:
        "Return one analysis object per candidate in `candidates`, in the same order, each keyed by the same `creatorId` you were given.",
    },
    null,
    2,
  );
}
