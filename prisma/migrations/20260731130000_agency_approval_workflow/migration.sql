-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'AGENCY_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'AGENCY_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'AGENCY_REQUEST_REJECTED';

-- AlterTable
ALTER TABLE "referral_links" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNote" TEXT;

