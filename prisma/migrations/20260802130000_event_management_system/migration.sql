-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('NETWORKING', 'WORKSHOP', 'CREATOR_MEETUP', 'PODCAST_RECORDING', 'PHOTOSHOOT', 'BRAND_ACTIVATION', 'PANEL_DISCUSSION', 'LAUNCH_PARTY', 'MASTERCLASS', 'COMMUNITY_MIXER', 'PRODUCT_DEMO', 'AWARDS_CEREMONY', 'HOLIDAY_CELEBRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "EventCheckInMethod" AS ENUM ('QR', 'MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'EVENT_PROPOSAL_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CHANGES_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CAPACITY_REACHED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_WAITLIST_PROMOTED';

-- AlterEnum
ALTER TYPE "RsvpStatus" ADD VALUE 'WAITLISTED';

-- AlterTable
ALTER TABLE "event_rsvps" ADD COLUMN     "waitlistPosition" INTEGER;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" UUID,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" UUID,
ADD COLUMN     "category" "EventCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "changeRequestNote" TEXT,
ADD COLUMN     "dressCode" TEXT,
ADD COLUMN     "equipmentNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "foodProvided" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hostContact" TEXT,
ADD COLUMN     "hostName" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "livestreamUrl" TEXT,
ADD COLUMN     "parkingInfo" TEXT,
ADD COLUMN     "registrationDeadline" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" UUID,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "sponsors" JSONB,
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "ticketPriceCents" INTEGER,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "qr_assets" ADD COLUMN     "eventId" UUID;

-- CreateTable
CREATE TABLE "event_check_ins" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInById" UUID,
    "method" "EventCheckInMethod" NOT NULL DEFAULT 'QR',

    CONSTRAINT "event_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_check_ins_eventId_idx" ON "event_check_ins"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_check_ins_eventId_memberId_key" ON "event_check_ins"("eventId", "memberId");

-- CreateIndex
CREATE INDEX "events_organizationId_status_idx" ON "events"("organizationId", "status");

-- CreateIndex
CREATE INDEX "events_organizationId_category_idx" ON "events"("organizationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "qr_assets_eventId_key" ON "qr_assets"("eventId");

-- AddForeignKey
ALTER TABLE "qr_assets" ADD CONSTRAINT "qr_assets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_check_ins" ADD CONSTRAINT "event_check_ins_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_check_ins" ADD CONSTRAINT "event_check_ins_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_check_ins" ADD CONSTRAINT "event_check_ins_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

