-- AlterTable
ALTER TABLE "members" ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "lookingFor" TEXT,
ADD COLUMN     "notifyCollabRequests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyProductUpdates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyProjectInvites" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifySpaceBookings" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyVisitorArrivals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyWeeklySummary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tiktokUrl" TEXT,
ADD COLUMN     "visibleInDirectory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

