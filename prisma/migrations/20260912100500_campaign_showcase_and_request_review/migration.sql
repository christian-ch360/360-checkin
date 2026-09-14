-- CreateEnum
CREATE TYPE "CampaignRequestReviewStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "campaign_requests" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "internalStatus" "CampaignRequestReviewStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "timeline" TEXT;

-- CreateTable
CREATE TABLE "campaign_showcases" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT NOT NULL,
    "galleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creatorCount" INTEGER,
    "totalReach" INTEGER,
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" "ContentCategory"[] DEFAULT ARRAY[]::"ContentCategory"[],
    "platforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "objective" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_showcases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_showcases_organizationId_published_sortOrder_idx" ON "campaign_showcases"("organizationId", "published", "sortOrder");

-- CreateIndex
CREATE INDEX "campaign_requests_organizationId_internalStatus_idx" ON "campaign_requests"("organizationId", "internalStatus");

-- AddForeignKey
ALTER TABLE "campaign_showcases" ADD CONSTRAINT "campaign_showcases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
