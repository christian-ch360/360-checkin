-- CreateEnum
CREATE TYPE "VisitorType" AS ENUM ('BRAND', 'CREATOR', 'AGENCY', 'VENDOR', 'BROKER', 'MEDIA', 'INTERVIEW', 'GUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitorStatus" AS ENUM ('WAITING', 'APPROVED', 'CHECKED_OUT');

-- AlterEnum
ALTER TYPE "QRAssetType" ADD VALUE 'VISITOR';

-- AlterTable
ALTER TABLE "qr_assets" ADD COLUMN     "visitorId" UUID;

-- CreateTable
CREATE TABLE "visitors" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "reasonForVisit" TEXT NOT NULL,
    "visitorType" "VisitorType" NOT NULL,
    "expectedTimeLeaving" TIMESTAMP(3),
    "photoUrl" TEXT,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "status" "VisitorStatus" NOT NULL DEFAULT 'WAITING',
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitors_organizationId_idx" ON "visitors"("organizationId");

-- CreateIndex
CREATE INDEX "visitors_status_idx" ON "visitors"("status");

-- CreateIndex
CREATE INDEX "visitors_arrivedAt_idx" ON "visitors"("arrivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "qr_assets_visitorId_key" ON "qr_assets"("visitorId");

-- AddForeignKey
ALTER TABLE "qr_assets" ADD CONSTRAINT "qr_assets_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

