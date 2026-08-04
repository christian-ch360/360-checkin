-- AlterTable
ALTER TABLE "members" ADD COLUMN     "businessRegistrationNumber" TEXT;

-- AlterTable
ALTER TABLE "membership_applications" ADD COLUMN     "businessRegistrationNumber" TEXT,
ADD COLUMN     "website" TEXT;

