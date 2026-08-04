-- CreateEnum
CREATE TYPE "CollabPostCategory" AS ENUM ('CREATOR', 'BRAND', 'AGENCY', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'EDITOR', 'MODEL', 'PODCAST', 'UGC');

-- CreateEnum
CREATE TYPE "CollabBudgetType" AS ENUM ('PAID', 'TRADE', 'FREE');

-- CreateEnum
CREATE TYPE "CollabLocation" AS ENUM ('ON_SITE', 'REMOTE');

-- CreateEnum
CREATE TYPE "CollabPostStatus" AS ENUM ('OPEN', 'CLOSED', 'FILLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'PROJECT_REF', 'RESERVATION_REF', 'VOICE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COLLAB_MESSAGE_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'COLLAB_APPLICATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'COLLAB_APPLICATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'COLLAB_POST_CLOSED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SpaceType" ADD VALUE 'LIVESTREAM_STUDIO';
ALTER TYPE "SpaceType" ADD VALUE 'CONTENT_LAB';
ALTER TYPE "SpaceType" ADD VALUE 'EVENT_SPACE';

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "projectId" UUID;

-- CreateTable
CREATE TABLE "collab_posts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CollabPostCategory" NOT NULL,
    "budgetType" "CollabBudgetType" NOT NULL,
    "budgetNote" TEXT,
    "dateNeeded" TIMESTAMP(3),
    "location" "CollabLocation" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "CollabPostStatus" NOT NULL DEFAULT 'OPEN',
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collab_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collab_applications" (
    "id" UUID NOT NULL,
    "collabPostId" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "collab_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collab_conversations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "collabPostId" UUID NOT NULL,
    "posterId" UUID NOT NULL,
    "initiatorId" UUID NOT NULL,
    "posterLastReadAt" TIMESTAMP(3),
    "initiatorLastReadAt" TIMESTAMP(3),
    "posterTypingAt" TIMESTAMP(3),
    "initiatorTypingAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collab_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collab_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "attachmentUrl" TEXT,
    "projectRefId" UUID,
    "reservationRefId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collab_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ReservationAttendees" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ReservationAttendees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "collab_posts_organizationId_idx" ON "collab_posts"("organizationId");

-- CreateIndex
CREATE INDEX "collab_posts_status_idx" ON "collab_posts"("status");

-- CreateIndex
CREATE INDEX "collab_posts_category_idx" ON "collab_posts"("category");

-- CreateIndex
CREATE INDEX "collab_posts_memberId_idx" ON "collab_posts"("memberId");

-- CreateIndex
CREATE INDEX "collab_applications_collabPostId_idx" ON "collab_applications"("collabPostId");

-- CreateIndex
CREATE INDEX "collab_applications_applicantId_idx" ON "collab_applications"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "collab_applications_collabPostId_applicantId_key" ON "collab_applications"("collabPostId", "applicantId");

-- CreateIndex
CREATE INDEX "collab_conversations_organizationId_idx" ON "collab_conversations"("organizationId");

-- CreateIndex
CREATE INDEX "collab_conversations_posterId_idx" ON "collab_conversations"("posterId");

-- CreateIndex
CREATE INDEX "collab_conversations_initiatorId_idx" ON "collab_conversations"("initiatorId");

-- CreateIndex
CREATE UNIQUE INDEX "collab_conversations_collabPostId_initiatorId_key" ON "collab_conversations"("collabPostId", "initiatorId");

-- CreateIndex
CREATE INDEX "collab_messages_conversationId_createdAt_idx" ON "collab_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "collab_messages_senderId_idx" ON "collab_messages"("senderId");

-- CreateIndex
CREATE INDEX "_ReservationAttendees_B_index" ON "_ReservationAttendees"("B");

-- CreateIndex
CREATE INDEX "reservations_projectId_idx" ON "reservations"("projectId");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_posts" ADD CONSTRAINT "collab_posts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_posts" ADD CONSTRAINT "collab_posts_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_applications" ADD CONSTRAINT "collab_applications_collabPostId_fkey" FOREIGN KEY ("collabPostId") REFERENCES "collab_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_applications" ADD CONSTRAINT "collab_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_conversations" ADD CONSTRAINT "collab_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_conversations" ADD CONSTRAINT "collab_conversations_collabPostId_fkey" FOREIGN KEY ("collabPostId") REFERENCES "collab_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_conversations" ADD CONSTRAINT "collab_conversations_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_conversations" ADD CONSTRAINT "collab_conversations_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_messages" ADD CONSTRAINT "collab_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "collab_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_messages" ADD CONSTRAINT "collab_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_messages" ADD CONSTRAINT "collab_messages_projectRefId_fkey" FOREIGN KEY ("projectRefId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_messages" ADD CONSTRAINT "collab_messages_reservationRefId_fkey" FOREIGN KEY ("reservationRefId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReservationAttendees" ADD CONSTRAINT "_ReservationAttendees_A_fkey" FOREIGN KEY ("A") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReservationAttendees" ADD CONSTRAINT "_ReservationAttendees_B_fkey" FOREIGN KEY ("B") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

