-- AlterTable
ALTER TABLE "spaces" ADD COLUMN "description" TEXT;
ALTER TABLE "spaces" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: seed displayOrder from each org's existing alphabetical order so
-- the first "Reorder" load isn't a jumble of all-zero ties.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY name ASC) - 1 AS rn
  FROM "spaces"
)
UPDATE "spaces" s SET "displayOrder" = ordered.rn
FROM ordered
WHERE ordered.id = s.id;
