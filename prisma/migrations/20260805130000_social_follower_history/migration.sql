-- Automatic Social Follower Sync — schema for Growth Analytics.
--
-- 1. Three new columns on social_connections:
--    - profileUrl: derived platform+username link, populated at sync time.
--    - verified: platform "verified badge" status. Only TikTok's user info
--      API documents an is_verified field; Instagram's Business Basic /me
--      and YouTube's channels.list don't expose one at this permission
--      tier, so this stays null there rather than guessing — see
--      docs/SOCIAL_INTEGRATIONS.md.
--    - lastSyncAttempt: set at the START of every sync, success or failure
--      — distinct from lastSyncedAt (success-only). Also doubles as the
--      atomic claim syncConnection() uses to prevent two concurrent syncs
--      of the same connection (see social-connections.service.ts).
--
-- 2. social_follower_history — append-only time series behind Growth
--    Analytics (today/7d/30d/90d/lifetime deltas, trend %). One row per
--    successful sync, never updated or overwritten. Deliberately keyed on
--    memberId+platform rather than a foreign key to social_connections: a
--    disconnect only ever flips that row's status, never deletes it, but a
--    real FK there would still codify a lifecycle coupling this table must
--    never have. History survives connect/disconnect/reconnect cycles by
--    design and only ever cascades away with the Member itself.

-- AlterTable
ALTER TABLE "social_connections" ADD COLUMN     "lastSyncAttempt" TIMESTAMP(3),
ADD COLUMN     "profileUrl" TEXT,
ADD COLUMN     "verified" BOOLEAN;

-- CreateTable
CREATE TABLE "social_follower_history" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "followers" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_follower_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_follower_history_memberId_platform_capturedAt_idx" ON "social_follower_history"("memberId", "platform", "capturedAt");

-- AddForeignKey
ALTER TABLE "social_follower_history" ADD CONSTRAINT "social_follower_history_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- RLS — mirrors social_connections' own policy exactly (own member row, or
-- org-wide admin), following the template established in
-- 20260724005200_store_connections_rls. SELECT-only: every write goes
-- through the postgres-role Prisma client, which bypasses RLS via table
-- ownership.
-- =============================================================================

ALTER TABLE "public"."social_follower_history" ENABLE ROW LEVEL SECURITY;

create policy "member can read own follower history, admin org-wide"
on "social_follower_history" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "social_follower_history"."memberId" and m."organizationId" = rls.org_id())
  )
);
