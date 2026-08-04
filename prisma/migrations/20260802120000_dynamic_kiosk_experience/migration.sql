
-- CreateEnum
CREATE TYPE "KioskThemeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KioskAnimationStyle" AS ENUM ('FADE', 'SLIDE', 'ZOOM', 'NONE');

-- CreateEnum
CREATE TYPE "KioskRecurrence" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY_NTH_WEEKDAY');

-- CreateEnum
CREATE TYPE "KioskSectionType" AS ENUM ('HERO', 'WELCOME_MESSAGE', 'EVENT_BANNER', 'ANNOUNCEMENTS', 'SPONSORS', 'FEATURED_CREATOR', 'FEATURED_BRAND', 'HIGHLIGHTS', 'QR_CHECKIN', 'REGISTER_NOW', 'CUSTOM');

-- CreateEnum
CREATE TYPE "KioskAnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KioskInteractionType" AS ENUM ('THEME_VIEW', 'QR_SCAN', 'CHECK_IN', 'REGISTRATION', 'CTA_CLICK', 'EVENT_SIGNUP');

-- CreateTable
CREATE TABLE "kiosk_themes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "themeKey" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "KioskThemeStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT,
    "location" TEXT,
    "backgroundImageUrl" TEXT,
    "backgroundVideoUrl" TEXT,
    "logoOverrideUrl" TEXT,
    "accentColor" TEXT,
    "buttonColor" TEXT,
    "textColor" TEXT,
    "animationStyle" "KioskAnimationStyle" NOT NULL DEFAULT 'FADE',
    "ctaLabel" TEXT,
    "ctaLink" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "recurrence" "KioskRecurrence" NOT NULL DEFAULT 'NONE',
    "recurrenceDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "recurrenceNthWeek" INTEGER,
    "recurrenceWeekday" INTEGER,
    "showCountdown" BOOLEAN NOT NULL DEFAULT false,
    "eventId" UUID,
    "sponsors" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPinnedLive" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "changeSummary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedById" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kiosk_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiosk_section_configs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sectionType" "KioskSectionType" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kiosk_section_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiosk_announcements" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaLink" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "status" "KioskAnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kiosk_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiosk_interaction_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "type" "KioskInteractionType" NOT NULL,
    "themeKey" UUID,
    "announcementId" UUID,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kiosk_interaction_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kiosk_themes_organizationId_themeKey_idx" ON "kiosk_themes"("organizationId", "themeKey");

-- CreateIndex
CREATE INDEX "kiosk_themes_organizationId_status_idx" ON "kiosk_themes"("organizationId", "status");

-- CreateIndex
CREATE INDEX "kiosk_themes_organizationId_startDate_endDate_idx" ON "kiosk_themes"("organizationId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_themes_organizationId_themeKey_version_key" ON "kiosk_themes"("organizationId", "themeKey", "version");

-- CreateIndex
CREATE INDEX "kiosk_section_configs_organizationId_order_idx" ON "kiosk_section_configs"("organizationId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_section_configs_organizationId_key_key" ON "kiosk_section_configs"("organizationId", "key");

-- CreateIndex
CREATE INDEX "kiosk_announcements_organizationId_status_idx" ON "kiosk_announcements"("organizationId", "status");

-- CreateIndex
CREATE INDEX "kiosk_interaction_events_organizationId_type_occurredAt_idx" ON "kiosk_interaction_events"("organizationId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "kiosk_interaction_events_organizationId_themeKey_idx" ON "kiosk_interaction_events"("organizationId", "themeKey");

-- AddForeignKey
ALTER TABLE "kiosk_themes" ADD CONSTRAINT "kiosk_themes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_themes" ADD CONSTRAINT "kiosk_themes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_themes" ADD CONSTRAINT "kiosk_themes_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_themes" ADD CONSTRAINT "kiosk_themes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_section_configs" ADD CONSTRAINT "kiosk_section_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_section_configs" ADD CONSTRAINT "kiosk_section_configs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_announcements" ADD CONSTRAINT "kiosk_announcements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_announcements" ADD CONSTRAINT "kiosk_announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_announcements" ADD CONSTRAINT "kiosk_announcements_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_interaction_events" ADD CONSTRAINT "kiosk_interaction_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_interaction_events" ADD CONSTRAINT "kiosk_interaction_events_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "kiosk_announcements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

