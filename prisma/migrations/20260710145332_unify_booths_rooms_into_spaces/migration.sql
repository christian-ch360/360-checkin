-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('PODCAST_BOOTH', 'EDITING_SUITE', 'PHOTOGRAPHY_STUDIO', 'CONFERENCE_ROOM', 'MEETING_ROOM', 'CREATOR_LOUNGE');

-- CreateEnum
CREATE TYPE "SpaceSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'PROJECT_ASSIGNED', 'GMV_ENTERED', 'COMMISSION_GENERATED', 'SPACE_STARTED', 'SPACE_FINISHED', 'MENTION', 'COMMENT', 'DEADLINE', 'SYSTEM');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "QRAssetType_new" AS ENUM ('MEMBER', 'PROJECT', 'BRAND', 'SPACE', 'EVENT');
ALTER TABLE "qr_assets" ALTER COLUMN "type" TYPE "QRAssetType_new" USING ("type"::text::"QRAssetType_new");
ALTER TYPE "QRAssetType" RENAME TO "QRAssetType_old";
ALTER TYPE "QRAssetType_new" RENAME TO "QRAssetType";
DROP TYPE "public"."QRAssetType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "booth_sessions" DROP CONSTRAINT "booth_sessions_boothId_fkey";

-- DropForeignKey
ALTER TABLE "booth_sessions" DROP CONSTRAINT "booth_sessions_brandId_fkey";

-- DropForeignKey
ALTER TABLE "booth_sessions" DROP CONSTRAINT "booth_sessions_companyId_fkey";

-- DropForeignKey
ALTER TABLE "booth_sessions" DROP CONSTRAINT "booth_sessions_memberId_fkey";

-- DropForeignKey
ALTER TABLE "booth_sessions" DROP CONSTRAINT "booth_sessions_projectId_fkey";

-- DropForeignKey
ALTER TABLE "booths" DROP CONSTRAINT "booths_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "qr_assets" DROP CONSTRAINT "qr_assets_boothId_fkey";

-- DropForeignKey
ALTER TABLE "qr_assets" DROP CONSTRAINT "qr_assets_roomId_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_organizationId_fkey";

-- DropIndex
DROP INDEX "qr_assets_boothId_key";

-- DropIndex
DROP INDEX "qr_assets_roomId_key";

-- AlterTable
ALTER TABLE "qr_assets" DROP COLUMN "boothId",
DROP COLUMN "roomId",
ADD COLUMN     "spaceId" UUID;

-- DropTable
DROP TABLE "booth_sessions";

-- DropTable
DROP TABLE "booths";

-- DropTable
DROP TABLE "rooms";

-- DropEnum
DROP TYPE "BoothSessionStatus";

-- DropEnum
DROP TYPE "BoothType";

-- CreateTable
CREATE TABLE "spaces" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SpaceType" NOT NULL,
    "capacity" INTEGER,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_sessions" (
    "id" UUID NOT NULL,
    "spaceId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "projectId" UUID,
    "brandId" UUID,
    "companyId" UUID,
    "status" "SpaceSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spaces_organizationId_idx" ON "spaces"("organizationId");

-- CreateIndex
CREATE INDEX "space_sessions_spaceId_idx" ON "space_sessions"("spaceId");

-- CreateIndex
CREATE INDEX "space_sessions_memberId_idx" ON "space_sessions"("memberId");

-- CreateIndex
CREATE INDEX "space_sessions_projectId_idx" ON "space_sessions"("projectId");

-- CreateIndex
CREATE INDEX "space_sessions_status_idx" ON "space_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "qr_assets_spaceId_key" ON "qr_assets"("spaceId");

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_sessions" ADD CONSTRAINT "space_sessions_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_sessions" ADD CONSTRAINT "space_sessions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_sessions" ADD CONSTRAINT "space_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_sessions" ADD CONSTRAINT "space_sessions_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_sessions" ADD CONSTRAINT "space_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_assets" ADD CONSTRAINT "qr_assets_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

