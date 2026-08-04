
-- AlterTable
ALTER TABLE "agency_access_requests" ADD COLUMN     "requestNote" TEXT;

-- AlterTable
ALTER TABLE "referral_links" DROP COLUMN "requestNote";

