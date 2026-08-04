-- CreateEnum
CREATE TYPE "LegalPageType" AS ENUM ('TERMS', 'PRIVACY', 'MEDIA_RELEASE', 'LIABILITY_RELEASE');

-- CreateEnum
CREATE TYPE "LegalVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "LegalVersionKind" AS ENUM ('MAJOR', 'MINOR');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEGAL_DOCUMENT_UPDATED';

-- CreateTable
CREATE TABLE "legal_document_versions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentType" "LegalPageType" NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "status" "LegalVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "versionKind" "LegalVersionKind",
    "changeSummary" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedById" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_document_versions_organizationId_documentType_status_idx" ON "legal_document_versions"("organizationId", "documentType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "legal_document_versions_organizationId_documentType_version_key" ON "legal_document_versions"("organizationId", "documentType", "version");

-- AddForeignKey
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

