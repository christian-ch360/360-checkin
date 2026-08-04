-- CreateEnum
CREATE TYPE "ProjectInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CollaborationRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "EmailStatus" ADD VALUE 'OPENED';
ALTER TYPE "EmailStatus" ADD VALUE 'CLICKED';
ALTER TYPE "EmailStatus" ADD VALUE 'BOUNCED';
ALTER TYPE "EmailStatus" ADD VALUE 'COMPLAINED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LIKE';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_FOLLOWER';

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "collabPostId" UUID;

-- AlterTable
ALTER TABLE "direct_conversations" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "event_rsvps" ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "startingSoonSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "member_subscriptions" ADD COLUMN     "trialEndingSoonNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "notifyComments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyFollows" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyLikes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyMentions" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "project_invitations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "brandId" UUID,
    "email" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL,
    "invitedById" UUID NOT NULL,
    "status" "ProjectInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_collaboration_requests" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "message" TEXT,
    "status" "CollaborationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_collaboration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collab_post_likes" (
    "id" UUID NOT NULL,
    "collabPostId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collab_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL,
    "followerId" UUID NOT NULL,
    "followingId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_invitations_token_key" ON "project_invitations"("token");

-- CreateIndex
CREATE INDEX "project_invitations_organizationId_idx" ON "project_invitations"("organizationId");

-- CreateIndex
CREATE INDEX "project_invitations_projectId_idx" ON "project_invitations"("projectId");

-- CreateIndex
CREATE INDEX "project_invitations_email_idx" ON "project_invitations"("email");

-- CreateIndex
CREATE INDEX "project_collaboration_requests_projectId_idx" ON "project_collaboration_requests"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_collaboration_requests_projectId_memberId_key" ON "project_collaboration_requests"("projectId", "memberId");

-- CreateIndex
CREATE INDEX "collab_post_likes_collabPostId_idx" ON "collab_post_likes"("collabPostId");

-- CreateIndex
CREATE UNIQUE INDEX "collab_post_likes_collabPostId_memberId_key" ON "collab_post_likes"("collabPostId", "memberId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "comments_collabPostId_idx" ON "comments"("collabPostId");

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_collaboration_requests" ADD CONSTRAINT "project_collaboration_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_collaboration_requests" ADD CONSTRAINT "project_collaboration_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_collabPostId_fkey" FOREIGN KEY ("collabPostId") REFERENCES "collab_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_post_likes" ADD CONSTRAINT "collab_post_likes_collabPostId_fkey" FOREIGN KEY ("collabPostId") REFERENCES "collab_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_post_likes" ADD CONSTRAINT "collab_post_likes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

