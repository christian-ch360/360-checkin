-- Duplicate-email resolution: adds a DUPLICATE status (a resolution state,
-- never an active application state) and the fields needed to record which
-- application was kept, which was marked duplicate, and who resolved it.
-- Purely additive — no existing row is touched, no existing application is
-- deleted, no enum value is removed.
ALTER TYPE "public"."MembershipApplicationStatus" ADD VALUE 'DUPLICATE';

ALTER TABLE "public"."membership_applications" ADD COLUMN "duplicateOfApplicationId" UUID;
ALTER TABLE "public"."membership_applications" ADD COLUMN "duplicateResolvedAt" TIMESTAMP(3);
ALTER TABLE "public"."membership_applications" ADD COLUMN "duplicateResolvedByMemberId" UUID;
ALTER TABLE "public"."membership_applications" ADD COLUMN "duplicateResolutionNote" TEXT;

CREATE INDEX "membership_applications_duplicateOfApplicationId_idx" ON "public"."membership_applications"("duplicateOfApplicationId");

ALTER TABLE "public"."membership_applications" ADD CONSTRAINT "membership_applications_duplicateOfApplicationId_fkey" FOREIGN KEY ("duplicateOfApplicationId") REFERENCES "public"."membership_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."membership_applications" ADD CONSTRAINT "membership_applications_duplicateResolvedByMemberId_fkey" FOREIGN KEY ("duplicateResolvedByMemberId") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
