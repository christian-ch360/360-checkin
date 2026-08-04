-- Rename MembershipApplication.creatorType -> role, add structured location fields
ALTER TABLE "membership_applications" RENAME COLUMN "creatorType" TO "role";
ALTER TABLE "membership_applications" ADD COLUMN "state" TEXT;
ALTER TABLE "membership_applications" ADD COLUMN "country" TEXT;
