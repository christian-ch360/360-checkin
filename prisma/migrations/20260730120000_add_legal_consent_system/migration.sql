-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY', 'DATA_PROCESSING', 'MEDIA_RELEASE', 'LIABILITY_RELEASE');

-- AlterTable
ALTER TABLE "email_logs" ALTER COLUMN "category" DROP DEFAULT;

-- AlterTable
ALTER TABLE "membership_applications" DROP COLUMN "termsAcceptedAt";

-- CreateTable
CREATE TABLE "legal_acceptances" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_application_legal_acceptances" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_application_legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_acceptances_memberId_idx" ON "legal_acceptances"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_acceptances_memberId_documentType_version_key" ON "legal_acceptances"("memberId", "documentType", "version");

-- CreateIndex
CREATE INDEX "membership_application_legal_acceptances_applicationId_idx" ON "membership_application_legal_acceptances"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_application_legal_acceptances_applicationId_docu_key" ON "membership_application_legal_acceptances"("applicationId", "documentType", "version");

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_application_legal_acceptances" ADD CONSTRAINT "membership_application_legal_acceptances_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "membership_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

