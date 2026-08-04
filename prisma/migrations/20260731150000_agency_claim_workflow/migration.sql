-- CreateEnum
CREATE TYPE "AgencyMemberRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "AgencyAccessStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'AGENCY_ACCESS_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'AGENCY_ACCESS_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'AGENCY_ACCESS_REJECTED';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "agencyId" UUID,
ADD COLUMN     "agencyRole" "AgencyMemberRole";

-- AlterTable
ALTER TABLE "membership_applications" ADD COLUMN     "claimedAgencyId" UUID,
ADD COLUMN     "claimedAgencyRole" "AgencyMemberRole";

-- CreateTable
CREATE TABLE "agency_access_requests" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "role" "AgencyMemberRole" NOT NULL,
    "status" "AgencyAccessStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" UUID,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agency_access_requests_requesterId_key" ON "agency_access_requests"("requesterId");

-- CreateIndex
CREATE INDEX "agency_access_requests_organizationId_agencyId_idx" ON "agency_access_requests"("organizationId", "agencyId");

-- CreateIndex
CREATE INDEX "agency_access_requests_status_idx" ON "agency_access_requests"("status");

-- CreateIndex
CREATE INDEX "members_agencyId_idx" ON "members"("agencyId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_access_requests" ADD CONSTRAINT "agency_access_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_access_requests" ADD CONSTRAINT "agency_access_requests_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_access_requests" ADD CONSTRAINT "agency_access_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_access_requests" ADD CONSTRAINT "agency_access_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

