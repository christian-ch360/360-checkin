-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('QR_CODE', 'LINK', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'TRANSFERRED');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredByCode" TEXT,
ADD COLUMN     "referredByMemberId" UUID;

-- AlterTable
ALTER TABLE "membership_applications" ADD COLUMN     "referralCode" TEXT;

-- CreateTable
CREATE TABLE "referral_links" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "referrerMemberId" UUID NOT NULL,
    "referrerRole" "MemberRole" NOT NULL,
    "referralCode" TEXT NOT NULL,
    "source" "ReferralSource" NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "applicationId" UUID,
    "memberId" UUID,
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_applicationId_key" ON "referral_links"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_memberId_key" ON "referral_links"("memberId");

-- CreateIndex
CREATE INDEX "referral_links_organizationId_referrerMemberId_idx" ON "referral_links"("organizationId", "referrerMemberId");

-- CreateIndex
CREATE INDEX "referral_links_referralCode_idx" ON "referral_links"("referralCode");

-- CreateIndex
CREATE INDEX "referral_links_status_idx" ON "referral_links"("status");

-- CreateIndex
CREATE UNIQUE INDEX "members_referralCode_key" ON "members"("referralCode");

-- CreateIndex
CREATE INDEX "members_referredByMemberId_idx" ON "members"("referredByMemberId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_referredByMemberId_fkey" FOREIGN KEY ("referredByMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_referrerMemberId_fkey" FOREIGN KEY ("referrerMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "membership_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

