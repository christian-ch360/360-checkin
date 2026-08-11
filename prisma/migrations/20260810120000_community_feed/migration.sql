-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('UPDATE', 'QUESTION', 'OPPORTUNITY', 'WIN', 'COLLABORATION', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "CommunityAttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReactionTargetType" AS ENUM ('POST', 'MESSAGE');

-- CreateEnum
CREATE TYPE "ReactionEmoji" AS ENUM ('LIKE', 'LOVE', 'FIRE', 'CLAP', 'LAUGH', 'CELEBRATE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_REACTION';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_ANNOUNCEMENT_POSTED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_POST_REPORTED';

-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "communityPostingSuspendedAt" TIMESTAMP(3),
ADD COLUMN     "communityPostingSuspendedReason" TEXT;

-- CreateTable
CREATE TABLE "community_posts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "type" "CommunityPostType" NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_attachments" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "type" "CommunityAttachmentType" NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comments" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "parentId" UUID,
    "body" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hashtags" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_hashtags" (
    "postId" UUID NOT NULL,
    "hashtagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_hashtags_pkey" PRIMARY KEY ("postId","hashtagId")
);

-- CreateTable
CREATE TABLE "community_post_mentions" (
    "postId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_mentions_pkey" PRIMARY KEY ("postId","memberId")
);

-- CreateTable
CREATE TABLE "community_post_reports" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,

    CONSTRAINT "community_post_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "targetType" "ReactionTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "emoji" "ReactionEmoji" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_posts_organizationId_idx" ON "community_posts"("organizationId");

-- CreateIndex
CREATE INDEX "community_posts_authorId_idx" ON "community_posts"("authorId");

-- CreateIndex
CREATE INDEX "community_posts_type_idx" ON "community_posts"("type");

-- CreateIndex
CREATE INDEX "community_attachments_postId_idx" ON "community_attachments"("postId");

-- CreateIndex
CREATE INDEX "community_comments_postId_idx" ON "community_comments"("postId");

-- CreateIndex
CREATE INDEX "community_comments_authorId_idx" ON "community_comments"("authorId");

-- CreateIndex
CREATE INDEX "community_comments_parentId_idx" ON "community_comments"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "hashtags_organizationId_tag_key" ON "hashtags"("organizationId", "tag");

-- CreateIndex
CREATE INDEX "community_post_hashtags_hashtagId_idx" ON "community_post_hashtags"("hashtagId");

-- CreateIndex
CREATE INDEX "community_post_mentions_memberId_idx" ON "community_post_mentions"("memberId");

-- CreateIndex
CREATE INDEX "community_post_reports_postId_idx" ON "community_post_reports"("postId");

-- CreateIndex
CREATE INDEX "community_post_reports_status_idx" ON "community_post_reports"("status");

-- CreateIndex
CREATE INDEX "reactions_targetType_targetId_idx" ON "reactions"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_targetType_targetId_memberId_emoji_key" ON "reactions"("targetType", "targetId", "memberId", "emoji");

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_attachments" ADD CONSTRAINT "community_attachments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hashtags" ADD CONSTRAINT "hashtags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_hashtags" ADD CONSTRAINT "community_post_hashtags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_hashtags" ADD CONSTRAINT "community_post_hashtags_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "hashtags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_mentions" ADD CONSTRAINT "community_post_mentions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_mentions" ADD CONSTRAINT "community_post_mentions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- RLS — enable + least-privilege SELECT policies for the 8 new tables, same
-- model as 20260805110000_agency_kiosk_rls: Prisma (postgres role) bypasses
-- RLS entirely and remains the only write path; these policies only govern
-- the anon/authenticated Supabase Data API surface. Soft-deleted rows
-- (deletedAt set) are NOT filtered here — that's app-level, consistent with
-- how Member.deletedAt is already handled.
-- =============================================================================

ALTER TABLE "public"."community_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."hashtags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_post_hashtags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_post_mentions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_post_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reactions" ENABLE ROW LEVEL SECURITY;

create policy "org member can read community posts"
on "community_posts" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "org member can read community attachments"
on "community_attachments" for select to authenticated
using (exists (select 1 from community_posts p where p.id = "postId" and p."organizationId" = rls.org_id()));

create policy "org member can read community comments"
on "community_comments" for select to authenticated
using (exists (select 1 from community_posts p where p.id = "postId" and p."organizationId" = rls.org_id()));

create policy "org member can read hashtags"
on "hashtags" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "org member can read community post hashtags"
on "community_post_hashtags" for select to authenticated
using (exists (select 1 from community_posts p where p.id = "postId" and p."organizationId" = rls.org_id()));

create policy "org member can read community post mentions"
on "community_post_mentions" for select to authenticated
using (exists (select 1 from community_posts p where p.id = "postId" and p."organizationId" = rls.org_id()));

-- Reports are only visible to the reporter (tracking their own report) and
-- org admins (who review them) — not the whole org, unlike the tables above.
create policy "reporter or org admin can read community post reports"
on "community_post_reports" for select to authenticated
using (
  "reporterId" = rls.member_id()
  or (rls.is_admin() and exists (select 1 from community_posts p where p.id = "postId" and p."organizationId" = rls.org_id()))
);

create policy "org member can read reactions"
on "reactions" for select to authenticated
using ("organizationId" = rls.org_id());
