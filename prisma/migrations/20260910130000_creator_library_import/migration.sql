-- Creator Library CSV Import & Organization system.
--   * 2 new ContentCategory values (Entertainment, Home & Design) so the
--     importer's category normalization covers the full "official" taxonomy.
--   * creator_library_profiles: memberId becomes optional (STANDALONE,
--     CSV-only directory entries) + standalone-identity columns + structured
--     country/state/city geography + import provenance.
--   * creator_import_batches: one row per import run (spec §17). The uploaded
--     file is never stored; `report` holds per-row outcomes for auditing.
-- Additive except `memberId` NOT NULL -> nullable (a safe widening; the table
-- shipped empty so no rows are affected).

-- AlterEnum
ALTER TYPE "ContentCategory" ADD VALUE 'ENTERTAINMENT';
ALTER TYPE "ContentCategory" ADD VALUE 'HOME_DESIGN';

-- CreateEnum
CREATE TYPE "CreatorImportStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CreatorImportMode" AS ENUM ('DRAFT', 'PUBLISH');

-- CreateEnum
CREATE TYPE "CreatorImportExistingMode" AS ENUM ('SKIP', 'FILL_MISSING', 'UPDATE_SELECTED');

-- CreateTable
CREATE TABLE "creator_import_batches" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "uploadedById" UUID,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "status" "CreatorImportStatus" NOT NULL DEFAULT 'PENDING',
    "importMode" "CreatorImportMode" NOT NULL DEFAULT 'DRAFT',
    "existingMode" "CreatorImportExistingMode" NOT NULL DEFAULT 'FILL_MISSING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "mapping" JSONB NOT NULL DEFAULT '{}',
    "report" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creator_import_batches_organizationId_createdAt_idx" ON "creator_import_batches"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "creator_import_batches" ADD CONSTRAINT "creator_import_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_import_batches" ADD CONSTRAINT "creator_import_batches_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "creator_library_profiles"
    ALTER COLUMN "memberId" DROP NOT NULL,
    ADD COLUMN "name" TEXT,
    ADD COLUMN "email" TEXT,
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "usernameHandle" TEXT,
    ADD COLUMN "instagramUrl" TEXT,
    ADD COLUMN "tiktokUrl" TEXT,
    ADD COLUMN "youtubeUrl" TEXT,
    ADD COLUMN "websiteUrl" TEXT,
    ADD COLUMN "companyName" TEXT,
    ADD COLUMN "country" TEXT,
    ADD COLUMN "state" TEXT,
    ADD COLUMN "city" TEXT,
    ADD COLUMN "importBatchId" UUID,
    ADD COLUMN "sourceRowNumber" INTEGER;

-- CreateIndex
CREATE INDEX "creator_library_profiles_organizationId_country_state_city_idx" ON "creator_library_profiles"("organizationId", "country", "state", "city");

-- CreateIndex
CREATE INDEX "creator_library_profiles_importBatchId_idx" ON "creator_library_profiles"("importBatchId");

-- AddForeignKey
ALTER TABLE "creator_library_profiles" ADD CONSTRAINT "creator_library_profiles_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "creator_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
