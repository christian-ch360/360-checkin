-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('ENTRANCE', 'BOOTH', 'PODCAST_ROOM', 'RECORDING_STUDIO', 'BEAUTY_CHAIR', 'ROOFTOP', 'CONFERENCE_ROOM', 'EDITING_BAY');

-- CreateEnum
CREATE TYPE "ScanEventAction" AS ENUM ('FACILITY_CHECK_IN', 'FACILITY_CHECK_OUT', 'SPACE_ENTER', 'SPACE_EXIT', 'VISITOR_CHECK_IN', 'VISITOR_CHECK_OUT');

-- AlterEnum
ALTER TYPE "QRAssetType" ADD VALUE 'LOCATION';

-- AlterTable
ALTER TABLE "qr_assets" ADD COLUMN     "locationId" UUID;

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_events" (
    "id" UUID NOT NULL,
    "memberId" UUID,
    "visitorId" UUID,
    "locationId" UUID,
    "locationName" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "deviceId" TEXT,
    "action" "ScanEventAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "scan_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_organizationId_idx" ON "locations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "locations_organizationId_slug_key" ON "locations"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "scan_events_memberId_idx" ON "scan_events"("memberId");

-- CreateIndex
CREATE INDEX "scan_events_locationId_idx" ON "scan_events"("locationId");

-- CreateIndex
CREATE INDEX "scan_events_timestamp_idx" ON "scan_events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "qr_assets_locationId_key" ON "qr_assets"("locationId");

-- AddForeignKey
ALTER TABLE "qr_assets" ADD CONSTRAINT "qr_assets_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

