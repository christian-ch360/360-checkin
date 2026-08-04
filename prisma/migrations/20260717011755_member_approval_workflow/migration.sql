-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MemberRole" ADD VALUE 'VENDOR';
ALTER TYPE "MemberRole" ADD VALUE 'STAFF';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MemberStatus" ADD VALUE 'PENDING';
ALTER TYPE "MemberStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" UUID,
ADD COLUMN     "followerCount" INTEGER,
ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" UUID,
ADD COLUMN     "rejectionReason" TEXT;

-- CreateTable
CREATE TABLE "member_notes" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_notes_memberId_idx" ON "member_notes"("memberId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data backfill: ensure every organization has all 5 commission tiers
-- (A 12%, B 10%, C 7%, D 5%, E 3%) available for admin assignment on the
-- approval workflow, even if only Tier A was ever created for it before.
INSERT INTO "commission_tiers" ("id", "organizationId", "code", "name", "percentage", "createdAt", "updatedAt")
SELECT gen_random_uuid(), o."id", t.code, t.name, t.percentage, now(), now()
FROM "organizations" o
CROSS JOIN (VALUES
  ('A'::"CommissionTierCode", 'Tier A', 12.00),
  ('B'::"CommissionTierCode", 'Tier B', 10.00),
  ('C'::"CommissionTierCode", 'Tier C', 7.00),
  ('D'::"CommissionTierCode", 'Tier D', 5.00),
  ('E'::"CommissionTierCode", 'Tier E', 3.00)
) AS t(code, name, percentage)
ON CONFLICT ("organizationId", "code") DO NOTHING;
