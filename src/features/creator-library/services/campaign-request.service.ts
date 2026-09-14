import "server-only";

import { prisma } from "@/lib/db/prisma";
import type {
  CampaignBudgetFlexibility,
  CampaignCandidateStatus,
  CampaignDeliverableType,
  CampaignGoal,
  CampaignLocationScope,
  CampaignRequestReviewStatus,
  CampaignRequestStatus,
  CampaignRequestType,
  ContentCategory,
  DesiredReachTier,
  SocialPlatform,
} from "@prisma/client";
import type { CampaignRequestParsed } from "@/features/creator-library/schemas/campaign-request.schema";

/**
 * Data-access layer for CampaignRequest/CampaignCandidate — plain async
 * functions (no "use server"), called by campaign-request.actions.ts (the
 * public submit action) and campaign-request-admin.actions.ts (internal
 * review). A CampaignRequest is a private brand intake form: every read
 * function here (`listCampaignRequests`, `getCampaignRequest`,
 * `getCampaignCandidates`) must only ever be called from
 * `requireCurrentMember()`-gated admin pages/actions — never from the
 * public, password-gate-only /creator-library surface. See
 * campaign-showcase.service.ts for the separate, genuinely public "Our
 * Work" read path.
 */

export type CampaignRequestSummary = {
  id: string;
  campaignName: string;
  campaignType: CampaignRequestType;
  status: CampaignRequestStatus;
  internalStatus: CampaignRequestReviewStatus;
  totalBudget: number | null;
  creatorCount: number | null;
  createdAt: Date;
};

export type CampaignRequestDetail = CampaignRequestSummary & {
  brandName: string | null;
  brandWebsite: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  timeline: string | null;
  description: string | null;
  goals: CampaignGoal[];
  objective: string | null;
  categories: ContentCategory[];
  platforms: SocialPlatform[];
  reachTiers: DesiredReachTier[];
  minimumFollowers: number | null;
  maximumFollowers: number | null;
  locationScope: CampaignLocationScope;
  country: string | null;
  state: string | null;
  city: string | null;
  deliverables: CampaignDeliverableType[];
  preferredBudgetPerCreator: number | null;
  budgetFlexibility: CampaignBudgetFlexibility | null;
  updatedAt: Date;
};

export type CampaignCandidateWithCreator = {
  id: string;
  campaignId: string;
  status: CampaignCandidateStatus;
  matchScore: number | null;
  matchReasoning: string | null;
  strengths: string[];
  concerns: string[];
  recommendedPayout: number | null;
  minimumSuggestedPayout: number | null;
  maximumSuggestedPayout: number | null;
  budgetReasoning: string | null;
  audienceFit: number | null;
  contentFit: number | null;
  platformFit: number | null;
  budgetFit: number | null;
  creator: {
    id: string;
    name: string;
    imageUrl: string | null;
    categories: ContentCategory[];
    platforms: SocialPlatform[];
    followers: number;
  };
};

function toSummary(row: {
  id: string;
  campaignName: string;
  campaignType: CampaignRequestType;
  status: CampaignRequestStatus;
  internalStatus: CampaignRequestReviewStatus;
  totalBudget: unknown;
  creatorCount: number | null;
  createdAt: Date;
}): CampaignRequestSummary {
  return {
    id: row.id,
    campaignName: row.campaignName,
    campaignType: row.campaignType,
    status: row.status,
    internalStatus: row.internalStatus,
    totalBudget: row.totalBudget == null ? null : Number(row.totalBudget),
    creatorCount: row.creatorCount,
    createdAt: row.createdAt,
  };
}

const DETAIL_SELECT = {
  id: true,
  campaignName: true,
  campaignType: true,
  status: true,
  internalStatus: true,
  totalBudget: true,
  creatorCount: true,
  createdAt: true,
  brandName: true,
  brandWebsite: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  timeline: true,
  description: true,
  goals: true,
  objective: true,
  categories: true,
  platforms: true,
  reachTiers: true,
  minimumFollowers: true,
  maximumFollowers: true,
  locationScope: true,
  country: true,
  state: true,
  city: true,
  deliverables: true,
  preferredBudgetPerCreator: true,
  budgetFlexibility: true,
  updatedAt: true,
} as const;

/** Admin-only — see file header. */
export async function listCampaignRequests(organizationId: string): Promise<CampaignRequestSummary[]> {
  const rows = await prisma.campaignRequest.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      campaignName: true,
      campaignType: true,
      status: true,
      internalStatus: true,
      totalBudget: true,
      creatorCount: true,
      createdAt: true,
    },
  });
  return rows.map(toSummary);
}

/** Admin-only — see file header. */
export async function getCampaignRequest(organizationId: string, id: string): Promise<CampaignRequestDetail | null> {
  const row = await prisma.campaignRequest.findFirst({ where: { id, organizationId }, select: DETAIL_SELECT });
  if (!row) return null;
  return {
    ...toSummary(row),
    brandName: row.brandName,
    brandWebsite: row.brandWebsite,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    timeline: row.timeline,
    description: row.description,
    goals: row.goals,
    objective: row.objective,
    categories: row.categories,
    platforms: row.platforms,
    reachTiers: row.reachTiers,
    minimumFollowers: row.minimumFollowers,
    maximumFollowers: row.maximumFollowers,
    locationScope: row.locationScope,
    country: row.country,
    state: row.state,
    city: row.city,
    deliverables: row.deliverables,
    preferredBudgetPerCreator: row.preferredBudgetPerCreator == null ? null : Number(row.preferredBudgetPerCreator),
    budgetFlexibility: row.budgetFlexibility,
    updatedAt: row.updatedAt,
  };
}

/**
 * Creates the campaign directly as SUBMITTED — the builder wizard is
 * client-state-only across its 6 steps (the campaign is saved once, when the
 * brand clicks "Find My Creators"), so there is no separate DRAFT-then-
 * submit write path today. `DRAFT` remains a valid status for future use
 * (e.g. an explicit "save for later"). No Modash/OpenAI pipeline runs from
 * this path — see campaign-request.actions.ts's `submitCampaignRequest` for
 * what happens instead (internal notification email).
 */
export async function createCampaignRequest(organizationId: string, input: CampaignRequestParsed): Promise<{ id: string }> {
  const row = await prisma.campaignRequest.create({
    data: {
      organizationId,
      campaignName: input.campaignName,
      brandName: input.brandName,
      brandWebsite: input.brandWebsite,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      timeline: input.timeline,
      campaignType: input.campaignType,
      description: input.description,
      goals: input.goals,
      objective: input.objective,
      categories: input.categories,
      platforms: input.platforms,
      reachTiers: input.reachTiers,
      minimumFollowers: input.minimumFollowers,
      maximumFollowers: input.maximumFollowers,
      locationScope: input.locationScope,
      country: input.country,
      state: input.state,
      city: input.city,
      deliverables: input.deliverables,
      creatorCount: input.creatorCount,
      totalBudget: input.totalBudget,
      preferredBudgetPerCreator: input.preferredBudgetPerCreator,
      budgetFlexibility: input.budgetFlexibility,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    select: { id: true },
  });
  return row;
}

export async function setCampaignStatus(
  campaignId: string,
  status: CampaignRequestStatus,
  extra?: { intelligenceCheckedAt?: Date },
): Promise<void> {
  await prisma.campaignRequest.update({
    where: { id: campaignId },
    data: { status, ...extra },
  });
}

/** Admin-only — the team's own review workflow (never shown to a brand). */
export async function setCampaignRequestInternalStatus(
  organizationId: string,
  id: string,
  internalStatus: CampaignRequestReviewStatus,
): Promise<boolean> {
  const result = await prisma.campaignRequest.updateMany({
    where: { id, organizationId },
    data: { internalStatus },
  });
  return result.count > 0;
}

export async function getCampaignCandidates(organizationId: string, campaignId: string): Promise<CampaignCandidateWithCreator[]> {
  const rows = await prisma.campaignCandidate.findMany({
    where: { campaignId, campaignRequest: { organizationId } },
    orderBy: [{ matchScore: "desc" }, { createdAt: "asc" }],
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          categories: true,
          instagramUrl: true,
          tiktokUrl: true,
          youtubeUrl: true,
          instagramFollowers: true,
          tiktokFollowers: true,
          youtubeSubscribers: true,
          member: { select: { displayName: true, fullName: true, profilePhotoUrl: true, contentCategories: true } },
        },
      },
    },
  });

  return rows.map((row) => {
    const platforms: SocialPlatform[] = [];
    if (row.creator.instagramUrl) platforms.push("INSTAGRAM");
    if (row.creator.tiktokUrl) platforms.push("TIKTOK");
    if (row.creator.youtubeUrl) platforms.push("YOUTUBE");
    const followers =
      (row.creator.instagramFollowers ?? 0) + (row.creator.tiktokFollowers ?? 0) + (row.creator.youtubeSubscribers ?? 0);

    return {
      id: row.id,
      campaignId: row.campaignId,
      status: row.status,
      matchScore: row.matchScore,
      matchReasoning: row.matchReasoning,
      strengths: row.strengths,
      concerns: row.concerns,
      recommendedPayout: row.recommendedPayout == null ? null : Number(row.recommendedPayout),
      minimumSuggestedPayout: row.minimumSuggestedPayout == null ? null : Number(row.minimumSuggestedPayout),
      maximumSuggestedPayout: row.maximumSuggestedPayout == null ? null : Number(row.maximumSuggestedPayout),
      budgetReasoning: row.budgetReasoning,
      audienceFit: row.audienceFit,
      contentFit: row.contentFit,
      platformFit: row.platformFit,
      budgetFit: row.budgetFit,
      creator: {
        id: row.creator.id,
        name: (row.creator.member?.displayName ?? row.creator.member?.fullName ?? row.creator.name ?? "Unnamed creator").trim(),
        imageUrl: row.creator.imageUrl ?? row.creator.member?.profilePhotoUrl ?? null,
        categories: row.creator.categories.length > 0 ? row.creator.categories : (row.creator.member?.contentCategories ?? []),
        platforms,
        followers,
      },
    };
  });
}

export async function updateCampaignCandidateStatus(
  organizationId: string,
  candidateId: string,
  status: CampaignCandidateStatus,
): Promise<boolean> {
  const result = await prisma.campaignCandidate.updateMany({
    where: { id: candidateId, campaignRequest: { organizationId } },
    data: { status },
  });
  return result.count > 0;
}
