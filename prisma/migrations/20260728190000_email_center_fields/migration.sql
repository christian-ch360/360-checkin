-- CreateEnum
CREATE TYPE "EmailCategory" AS ENUM ('AUTHENTICATION', 'MEMBERSHIP', 'COMMUNITY', 'MESSAGING', 'PROJECTS', 'SPACES', 'EVENTS', 'ADMIN', 'BILLING', 'MARKETING', 'SYSTEM');

-- DropIndex
DROP INDEX "email_logs_organizationId_idx";

-- DropIndex
DROP INDEX "email_logs_status_idx";

-- AlterTable
-- category temporarily defaults to SYSTEM so existing rows satisfy NOT NULL;
-- backfilled to the real per-template category below, then the default is
-- dropped since every future write sets it explicitly (see email-service.ts).
ALTER TABLE "email_logs" ADD COLUMN     "bouncedAt" TIMESTAMP(3),
ADD COLUMN     "category" "EmailCategory" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "clickedAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "from" TEXT,
ADD COLUMN     "html" TEXT,
ADD COLUMN     "openedAt" TIMESTAMP(3),
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'resend',
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "replyTo" TEXT,
ADD COLUMN     "sentById" UUID,
ADD COLUMN     "text" TEXT;

-- CreateIndex
CREATE INDEX "email_logs_organizationId_createdAt_idx" ON "email_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_organizationId_status_idx" ON "email_logs"("organizationId", "status");

-- CreateIndex
CREATE INDEX "email_logs_organizationId_category_idx" ON "email_logs"("organizationId", "category");

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill category for existing rows from their template name (mirrors
-- src/features/communications/config/template-catalog.ts's TEMPLATE_CATEGORY).
UPDATE "email_logs" SET "category" = CASE "template"
  WHEN 'welcome' THEN 'AUTHENTICATION'
  WHEN 'password_reset' THEN 'AUTHENTICATION'
  WHEN 'verify_email' THEN 'AUTHENTICATION'
  WHEN 'password_changed' THEN 'AUTHENTICATION'
  WHEN 'email_changed' THEN 'AUTHENTICATION'
  WHEN 'org_invitation' THEN 'ADMIN'
  WHEN 'new_membership_application_admin' THEN 'ADMIN'
  WHEN 'new_creator_joined_admin' THEN 'ADMIN'
  WHEN 'daily_admin_summary' THEN 'ADMIN'
  WHEN 'critical_system_alert' THEN 'SYSTEM'
  WHEN 'reservation_confirmed' THEN 'SPACES'
  WHEN 'reservation_reminder' THEN 'SPACES'
  WHEN 'reservation_cancelled' THEN 'SPACES'
  WHEN 'visitor_arrival' THEN 'ADMIN'
  WHEN 'commission_notification' THEN 'BILLING'
  WHEN 'announcement' THEN 'MARKETING'
  WHEN 'membership_approved' THEN 'MEMBERSHIP'
  WHEN 'membership_denied' THEN 'MEMBERSHIP'
  WHEN 'application_received' THEN 'MEMBERSHIP'
  WHEN 'application_approved' THEN 'MEMBERSHIP'
  WHEN 'application_rejected' THEN 'MEMBERSHIP'
  WHEN 'membership_activated' THEN 'MEMBERSHIP'
  WHEN 'trial_ending_soon' THEN 'BILLING'
  WHEN 'subscription_renewal' THEN 'BILLING'
  WHEN 'payment_failed' THEN 'BILLING'
  WHEN 'new_like' THEN 'COMMUNITY'
  WHEN 'new_comment' THEN 'COMMUNITY'
  WHEN 'mention' THEN 'COMMUNITY'
  WHEN 'new_follower' THEN 'COMMUNITY'
  WHEN 'conversation_invitation' THEN 'MESSAGING'
  WHEN 'new_direct_message' THEN 'MESSAGING'
  WHEN 'new_group_message' THEN 'MESSAGING'
  WHEN 'brand_invitation' THEN 'PROJECTS'
  WHEN 'collaboration_request' THEN 'PROJECTS'
  WHEN 'project_approved' THEN 'PROJECTS'
  WHEN 'project_completed' THEN 'PROJECTS'
  WHEN 'event_registration' THEN 'EVENTS'
  WHEN 'event_reminder' THEN 'EVENTS'
  WHEN 'event_starting_soon' THEN 'EVENTS'
  ELSE 'SYSTEM'
END::"EmailCategory";

