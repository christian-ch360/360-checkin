import "server-only";

import { prisma } from "@/lib/db/prisma";
import { isModashConfigured, searchCreators, getCreatorReport } from "@/lib/integrations/modash/modash.service";
import { isOpenAIConfigured, analyzeCampaignCandidates } from "@/lib/integrations/openai/campaign-intelligence.service";
import type { CampaignIntelligenceCandidateInput } from "@/lib/integrations/openai/campaign-intelligence.types";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import { CAMPAIGN_GOAL_LABELS, CAMPAIGN_TYPE_LABELS, CAMPAIGN_DELIVERABLE_LABELS } from "@/features/creator-library/config/campaign-config";
import type { SocialPlatform } from "@prisma/client";

/**
 * The full pipeline (spec §10):
 *
 *   CAMPAIGN SAVED → MODASH DISCOVERY → NORMALIZE → MATCH WITH CREATOR
 *   LIBRARY → OPENAI ANALYSIS → CANDIDATES SCORED & PAYOUTS RECOMMENDED →
 *   TOP CANDIDATES SAVED
 *
 * Called once, right after a CampaignRequest is created (from
 * campaign-request.actions.ts's `submitCampaignRequest`). Stops gracefully
 * at whichever integration boundary is missing credentials — this is the
 * ONLY place that decides "CAMPAIGN_INTELLIGENCE_UNAVAILABLE" vs. running
 * the real pipeline, so turning the feature on later is exactly "set both
 * env vars," nothing else changes.
 */
export type CampaignIntelligenceOutcome =
  | { ok: true; candidateCount: number }
  | { ok: false; reason: "CAMPAIGN_INTELLIGENCE_UNAVAILABLE" }
  | { ok: false; reason: "CAMPAIGN_INTELLIGENCE_FAILED"; error: string };

export function isCampaignIntelligenceAvailable(): boolean {
  return isModashConfigured() && isOpenAIConfigured();
}

export async function generateCampaignCandidates(campaignId: string): Promise<CampaignIntelligenceOutcome> {
  if (!isCampaignIntelligenceAvailable()) {
    await prisma.campaignRequest.update({
      where: { id: campaignId },
      data: { intelligenceCheckedAt: new Date() },
    });
    return { ok: false, reason: "CAMPAIGN_INTELLIGENCE_UNAVAILABLE" };
  }

  const campaign = await prisma.campaignRequest.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, reason: "CAMPAIGN_INTELLIGENCE_FAILED", error: "Campaign not found." };

  try {
    await prisma.campaignRequest.update({ where: { id: campaignId }, data: { status: "ANALYZING" } });

    // 1. Modash Creator Discovery
    const platforms = (campaign.platforms.length > 0 ? campaign.platforms : (["INSTAGRAM", "TIKTOK", "YOUTUBE"] as SocialPlatform[])).filter(
      (p): p is "INSTAGRAM" | "TIKTOK" | "YOUTUBE" => p === "INSTAGRAM" || p === "TIKTOK" || p === "YOUTUBE",
    );
    const discovery = await searchCreators({
      platforms,
      categories: campaign.categories,
      minFollowers: campaign.minimumFollowers,
      maxFollowers: campaign.maximumFollowers,
      location: campaign.locationScope === "WORLDWIDE" ? null : { country: campaign.country, state: campaign.state, city: campaign.city },
      limit: 50,
    });
    if (!discovery.ok) return { ok: false, reason: "CAMPAIGN_INTELLIGENCE_FAILED", error: discovery.error };

    // 2. Enrichment (best-effort per discovered creator)
    const enriched = await Promise.all(
      discovery.data.map(async (creator) => {
        const report = await getCreatorReport(creator.platform, creator.modashUserId);
        return { creator, report: report.ok ? report.data : null };
      }),
    );

    // 3. Match with Creator Library — a discovered Modash handle only becomes
    // a candidate if it corresponds to a real, visible CreatorLibraryProfile
    // in this organization (candidates always link to a real profile brands
    // can view via "View Profile").
    const libraryProfiles = await prisma.creatorLibraryProfile.findMany({
      where: { organizationId: campaign.organizationId, visible: true },
      select: {
        id: true,
        usernameHandle: true,
        instagramUrl: true,
        tiktokUrl: true,
        youtubeUrl: true,
        categories: true,
        instagramFollowers: true,
        tiktokFollowers: true,
        youtubeSubscribers: true,
        country: true,
        state: true,
        city: true,
        member: { select: { username: true, contentCategories: true } },
      },
    });

    const matched: { creatorId: string; input: CampaignIntelligenceCandidateInput }[] = [];
    for (const { creator } of enriched) {
      const handle = creator.handle.toLowerCase().replace(/^@/, "");
      const profile = libraryProfiles.find((p) => {
        const candidates = [p.usernameHandle, p.member?.username, p.instagramUrl, p.tiktokUrl, p.youtubeUrl]
          .filter(Boolean)
          .map((v) => v!.toLowerCase());
        return candidates.some((c) => c.includes(handle));
      });
      if (!profile) continue;

      const categories = profile.categories.length > 0 ? profile.categories : (profile.member?.contentCategories ?? []);
      const profilePlatforms: string[] = [];
      if (profile.instagramUrl) profilePlatforms.push("INSTAGRAM");
      if (profile.tiktokUrl) profilePlatforms.push("TIKTOK");
      if (profile.youtubeUrl) profilePlatforms.push("YOUTUBE");
      const totalFollowers =
        (profile.instagramFollowers ?? 0) + (profile.tiktokFollowers ?? 0) + (profile.youtubeSubscribers ?? 0) || creator.followers;

      matched.push({
        creatorId: profile.id,
        input: {
          creatorId: profile.id,
          name: creator.displayName ?? creator.handle,
          categories: categories.map((c) => CONTENT_CATEGORY_LABELS[c]),
          platforms: profilePlatforms,
          totalFollowers,
          engagementRate: creator.engagementRate,
          location: [profile.city, profile.state, profile.country].filter(Boolean).join(", ") || null,
        },
      });
    }

    if (matched.length === 0) {
      await prisma.campaignRequest.update({ where: { id: campaignId }, data: { status: "MATCHED" } });
      return { ok: true, candidateCount: 0 };
    }

    // 4. OpenAI campaign analysis — scoring + payout recommendations
    const analysis = await analyzeCampaignCandidates(
      {
        campaignName: campaign.campaignName,
        campaignType: CAMPAIGN_TYPE_LABELS[campaign.campaignType],
        description: campaign.description,
        goals: campaign.goals.map((g) => CAMPAIGN_GOAL_LABELS[g]),
        objective: campaign.objective,
        categories: campaign.categories.map((c) => CONTENT_CATEGORY_LABELS[c]),
        platforms: campaign.platforms,
        totalBudget: campaign.totalBudget == null ? null : Number(campaign.totalBudget),
        preferredBudgetPerCreator: campaign.preferredBudgetPerCreator == null ? null : Number(campaign.preferredBudgetPerCreator),
        budgetFlexibility: campaign.budgetFlexibility,
        creatorCount: campaign.creatorCount,
        deliverables: campaign.deliverables.map((d) => CAMPAIGN_DELIVERABLE_LABELS[d]),
      },
      matched.map((m) => m.input),
    );
    if (!analysis.ok) return { ok: false, reason: "CAMPAIGN_INTELLIGENCE_FAILED", error: analysis.error };

    // 5. Save scored candidates
    await prisma.$transaction(
      analysis.data.candidates.map((result) =>
        prisma.campaignCandidate.upsert({
          where: { campaignId_creatorId: { campaignId, creatorId: result.creatorId } },
          create: {
            campaignId,
            creatorId: result.creatorId,
            matchScore: result.matchScore,
            matchReasoning: result.matchReasoning,
            strengths: result.strengths,
            concerns: result.concerns,
            audienceFit: result.audienceFit,
            contentFit: result.contentFit,
            platformFit: result.platformFit,
            budgetFit: result.budgetFit,
            recommendedPayout: result.recommendedPayout,
            minimumSuggestedPayout: result.minimumSuggestedPayout,
            maximumSuggestedPayout: result.maximumSuggestedPayout,
            budgetReasoning: result.budgetReasoning,
          },
          update: {
            matchScore: result.matchScore,
            matchReasoning: result.matchReasoning,
            strengths: result.strengths,
            concerns: result.concerns,
            audienceFit: result.audienceFit,
            contentFit: result.contentFit,
            platformFit: result.platformFit,
            budgetFit: result.budgetFit,
            recommendedPayout: result.recommendedPayout,
            minimumSuggestedPayout: result.minimumSuggestedPayout,
            maximumSuggestedPayout: result.maximumSuggestedPayout,
            budgetReasoning: result.budgetReasoning,
          },
        }),
      ),
    );

    await prisma.campaignRequest.update({ where: { id: campaignId }, data: { status: "MATCHED" } });
    return { ok: true, candidateCount: analysis.data.candidates.length };
  } catch (error) {
    await prisma.campaignRequest.update({ where: { id: campaignId }, data: { status: "FAILED" } });
    return { ok: false, reason: "CAMPAIGN_INTELLIGENCE_FAILED", error: error instanceof Error ? error.message : "Unknown error." };
  }
}
