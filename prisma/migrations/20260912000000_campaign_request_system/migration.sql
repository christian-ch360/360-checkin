-- CreateEnum
CREATE TYPE "CampaignRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ANALYZING', 'MATCHED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignRequestType" AS ENUM ('PRODUCT_LAUNCH', 'BRAND_AWARENESS', 'UGC_CAMPAIGN', 'SOCIAL_MEDIA_CAMPAIGN', 'INFLUENCER_PARTNERSHIP', 'EVENT_PROMOTION', 'AFFILIATE_CAMPAIGN', 'AMBASSADOR_PROGRAM', 'OTHER');

-- CreateEnum
CREATE TYPE "CampaignGoal" AS ENUM ('BRAND_AWARENESS', 'REACH', 'ENGAGEMENT', 'CONTENT_CREATION', 'WEBSITE_TRAFFIC', 'PRODUCT_SALES', 'APP_DOWNLOADS', 'EVENT_ATTENDANCE');

-- CreateEnum
CREATE TYPE "DesiredReachTier" AS ENUM ('NANO', 'MICRO', 'MID_TIER', 'MACRO', 'MEGA');

-- CreateEnum
CREATE TYPE "CampaignLocationScope" AS ENUM ('WORLDWIDE', 'COUNTRY', 'STATE', 'CITY');

-- CreateEnum
CREATE TYPE "CampaignDeliverableType" AS ENUM ('INSTAGRAM_FEED_POST', 'INSTAGRAM_REEL', 'INSTAGRAM_STORY', 'TIKTOK_VIDEO', 'TIKTOK_STORY', 'YOUTUBE_SHORT', 'YOUTUBE_DEDICATED_VIDEO', 'YOUTUBE_INTEGRATION');

-- CreateEnum
CREATE TYPE "CampaignBudgetFlexibility" AS ENUM ('FIXED', 'SOME_FLEXIBILITY', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "CampaignCandidateStatus" AS ENUM ('RECOMMENDED', 'SHORTLISTED', 'APPROVED', 'REJECTED', 'CONTACTED', 'BOOKED');

-- CreateTable
CREATE TABLE "campaign_requests" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "brandName" TEXT,
    "brandWebsite" TEXT,
    "campaignName" TEXT NOT NULL,
    "campaignType" "CampaignRequestType" NOT NULL,
    "description" TEXT,
    "goals" "CampaignGoal"[] DEFAULT ARRAY[]::"CampaignGoal"[],
    "objective" TEXT,
    "categories" "ContentCategory"[] DEFAULT ARRAY[]::"ContentCategory"[],
    "platforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "reachTiers" "DesiredReachTier"[] DEFAULT ARRAY[]::"DesiredReachTier"[],
    "minimumFollowers" INTEGER,
    "maximumFollowers" INTEGER,
    "locationScope" "CampaignLocationScope" NOT NULL DEFAULT 'WORLDWIDE',
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "deliverables" "CampaignDeliverableType"[] DEFAULT ARRAY[]::"CampaignDeliverableType"[],
    "creatorCount" INTEGER,
    "totalBudget" DECIMAL(12,2),
    "preferredBudgetPerCreator" DECIMAL(12,2),
    "budgetFlexibility" "CampaignBudgetFlexibility",
    "status" "CampaignRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "intelligenceCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_candidates" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "matchScore" INTEGER,
    "matchReasoning" TEXT,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "concerns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendedPayout" DECIMAL(12,2),
    "minimumSuggestedPayout" DECIMAL(12,2),
    "maximumSuggestedPayout" DECIMAL(12,2),
    "budgetReasoning" TEXT,
    "audienceFit" INTEGER,
    "contentFit" INTEGER,
    "platformFit" INTEGER,
    "budgetFit" INTEGER,
    "status" "CampaignCandidateStatus" NOT NULL DEFAULT 'RECOMMENDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_requests_organizationId_status_idx" ON "campaign_requests"("organizationId", "status");

-- CreateIndex
CREATE INDEX "campaign_requests_organizationId_createdAt_idx" ON "campaign_requests"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "campaign_candidates_campaignId_status_idx" ON "campaign_candidates"("campaignId", "status");

-- CreateIndex
CREATE INDEX "campaign_candidates_creatorId_idx" ON "campaign_candidates"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_candidates_campaignId_creatorId_key" ON "campaign_candidates"("campaignId", "creatorId");

-- AddForeignKey
ALTER TABLE "campaign_requests" ADD CONSTRAINT "campaign_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_candidates" ADD CONSTRAINT "campaign_candidates_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_candidates" ADD CONSTRAINT "campaign_candidates_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_library_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
