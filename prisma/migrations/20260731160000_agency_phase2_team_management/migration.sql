-- CreateEnum
CREATE TYPE "AgencyInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AgencyActivityType" AS ENUM ('INVITATION_SENT', 'INVITATION_ACCEPTED', 'INVITATION_DECLINED', 'INVITATION_REVOKED', 'TEAM_MEMBER_REMOVED', 'ROLE_CHANGED', 'OWNERSHIP_TRANSFERRED', 'CREATOR_REQUEST_RECEIVED', 'CREATOR_APPROVED', 'CREATOR_REJECTED', 'CREATOR_JOINED', 'FIRST_GMV', 'GMV_MILESTONE', 'PROFILE_UPDATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'TEAM_INVITATION_SENT';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_INVITATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_INVITATION_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_INVITATION_REVOKED';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_ROLE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_OWNERSHIP_TRANSFERRED';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_MEMBER_REMOVED';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "agencyCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "membership_applications" ADD COLUMN     "agencyInviteToken" TEXT;

-- AlterTable
ALTER TABLE "referral_links" ADD COLUMN     "requestNote" TEXT;

-- CreateTable
CREATE TABLE "agency_invitations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "AgencyMemberRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "AgencyInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" UUID,
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_activities" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "type" "AgencyActivityType" NOT NULL,
    "actorId" UUID,
    "targetId" UUID,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agency_invitations_token_key" ON "agency_invitations"("token");

-- CreateIndex
CREATE INDEX "agency_invitations_organizationId_agencyId_idx" ON "agency_invitations"("organizationId", "agencyId");

-- CreateIndex
CREATE INDEX "agency_invitations_email_idx" ON "agency_invitations"("email");

-- CreateIndex
CREATE INDEX "agency_invitations_status_idx" ON "agency_invitations"("status");

-- CreateIndex
CREATE INDEX "agency_activities_organizationId_agencyId_createdAt_idx" ON "agency_activities"("organizationId", "agencyId", "createdAt");

-- AddForeignKey
ALTER TABLE "agency_invitations" ADD CONSTRAINT "agency_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_invitations" ADD CONSTRAINT "agency_invitations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_invitations" ADD CONSTRAINT "agency_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_invitations" ADD CONSTRAINT "agency_invitations_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_activities" ADD CONSTRAINT "agency_activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_activities" ADD CONSTRAINT "agency_activities_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_activities" ADD CONSTRAINT "agency_activities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_activities" ADD CONSTRAINT "agency_activities_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

