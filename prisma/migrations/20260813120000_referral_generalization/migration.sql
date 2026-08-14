-- Referral generalization: lets Admins/Super Admins disable a referral code
-- without touching historical ReferralLink attribution. Safe/reversible:
-- adds one nullable-by-default column, no data migration, no existing rows
-- touched.
ALTER TABLE "public"."members" ADD COLUMN "referralCodeDisabled" BOOLEAN NOT NULL DEFAULT false;
