-- Attendance & Occupancy upgrade: rename CheckIn fields, add status, drop isLate.
-- Hand-written (not prisma migrate diff) specifically to RENAME columns rather
-- than drop+recreate, so existing check-in history survives.

-- New enum
CREATE TYPE "CheckInStatus" AS ENUM ('CHECKED_IN', 'CHECKED_OUT');

-- Rename columns — preserves all existing timestamp data
ALTER TABLE "check_ins" RENAME COLUMN "arrivalTime" TO "checkIn";
ALTER TABLE "check_ins" RENAME COLUMN "departureTime" TO "checkOut";

-- duration: Int minutes, replacing hoursWorked (Decimal hours). Backfill by
-- converting existing hours to minutes before dropping the old column.
ALTER TABLE "check_ins" ADD COLUMN "duration" INTEGER;
UPDATE "check_ins" SET "duration" = ROUND("hoursWorked" * 60) WHERE "hoursWorked" IS NOT NULL;
ALTER TABLE "check_ins" DROP COLUMN "hoursWorked";

-- status: real stored column (not purely derived), backfilled from whether
-- checkOut was ever set.
ALTER TABLE "check_ins" ADD COLUMN "status" "CheckInStatus" NOT NULL DEFAULT 'CHECKED_IN';
UPDATE "check_ins" SET "status" = 'CHECKED_OUT' WHERE "checkOut" IS NOT NULL;

-- Late tracking is explicitly out of scope for this product — drop entirely.
ALTER TABLE "check_ins" DROP COLUMN "isLate";

-- updatedAt: new column, backfill existing rows with createdAt before making it NOT NULL.
ALTER TABLE "check_ins" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "check_ins" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "check_ins" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Rename the arrivalTime index to match the renamed column.
DROP INDEX IF EXISTS "check_ins_arrivalTime_idx";
CREATE INDEX "check_ins_checkIn_idx" ON "check_ins"("checkIn");
