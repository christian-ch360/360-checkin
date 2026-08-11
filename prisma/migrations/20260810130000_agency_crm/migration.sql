-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FolderVisibility" AS ENUM ('AGENCY_ONLY', 'SHARED_WITH_CREATORS', 'SHARED_WITH_BRAND');

-- CreateEnum
CREATE TYPE "BrandInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgencyActivityType" ADD VALUE 'CAMPAIGN_CREATED';
ALTER TYPE "AgencyActivityType" ADD VALUE 'CAMPAIGN_STATUS_CHANGED';
ALTER TYPE "AgencyActivityType" ADD VALUE 'CONTRACT_SENT';
ALTER TYPE "AgencyActivityType" ADD VALUE 'CONTRACT_SIGNED';
ALTER TYPE "AgencyActivityType" ADD VALUE 'INVOICE_PAID';
ALTER TYPE "AgencyActivityType" ADD VALUE 'TASK_ASSIGNED';

-- AlterEnum
ALTER TYPE "AgencyMemberRole" ADD VALUE 'ADMIN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CAMPAIGN_APPROVAL_NEEDED';
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_SIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'INVOICE_OVERDUE';

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "industry" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" "BrandStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "taskId" UUID;

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "agencyId" UUID,
ADD COLUMN     "campaignId" UUID,
ADD COLUMN     "folderId" UUID;

-- AlterTable
ALTER TABLE "gmv_transactions" ADD COLUMN     "campaignId" UUID;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "brandId" UUID,
ADD COLUMN     "rateCard" JSONB;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "campaignId" UUID,
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_creators" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_deliverables" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "DeliverableStatus" NOT NULL DEFAULT 'PENDING',
    "assignedCreatorId" UUID,
    "submittedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "campaignId" UUID,
    "brandId" UUID,
    "creatorMemberId" UUID,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "docusignEnvelopeId" TEXT,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "campaignId" UUID,
    "brandId" UUID,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "parentFolderId" UUID,
    "name" TEXT NOT NULL,
    "visibility" "FolderVisibility" NOT NULL DEFAULT 'AGENCY_ONLY',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_invitations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "BrandInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_organizationId_agencyId_idx" ON "campaigns"("organizationId", "agencyId");

-- CreateIndex
CREATE INDEX "campaigns_brandId_idx" ON "campaigns"("brandId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaign_creators_creatorId_idx" ON "campaign_creators"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_creators_campaignId_creatorId_key" ON "campaign_creators"("campaignId", "creatorId");

-- CreateIndex
CREATE INDEX "campaign_deliverables_campaignId_idx" ON "campaign_deliverables"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_deliverables_assignedCreatorId_idx" ON "campaign_deliverables"("assignedCreatorId");

-- CreateIndex
CREATE INDEX "contracts_organizationId_agencyId_idx" ON "contracts"("organizationId", "agencyId");

-- CreateIndex
CREATE INDEX "contracts_campaignId_idx" ON "contracts"("campaignId");

-- CreateIndex
CREATE INDEX "contracts_brandId_idx" ON "contracts"("brandId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_expiresAt_idx" ON "contracts"("expiresAt");

-- CreateIndex
CREATE INDEX "contract_versions_contractId_idx" ON "contract_versions"("contractId");

-- CreateIndex
CREATE INDEX "invoices_organizationId_agencyId_idx" ON "invoices"("organizationId", "agencyId");

-- CreateIndex
CREATE INDEX "invoices_campaignId_idx" ON "invoices"("campaignId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_agencyId_invoiceNumber_key" ON "invoices"("agencyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "folders_organizationId_agencyId_idx" ON "folders"("organizationId", "agencyId");

-- CreateIndex
CREATE INDEX "folders_parentFolderId_idx" ON "folders"("parentFolderId");

-- CreateIndex
CREATE UNIQUE INDEX "brand_invitations_token_key" ON "brand_invitations"("token");

-- CreateIndex
CREATE INDEX "brand_invitations_organizationId_brandId_idx" ON "brand_invitations"("organizationId", "brandId");

-- CreateIndex
CREATE INDEX "brand_invitations_agencyId_idx" ON "brand_invitations"("agencyId");

-- CreateIndex
CREATE INDEX "brand_invitations_email_idx" ON "brand_invitations"("email");

-- CreateIndex
CREATE INDEX "brand_invitations_status_idx" ON "brand_invitations"("status");

-- CreateIndex
CREATE INDEX "comments_taskId_idx" ON "comments"("taskId");

-- CreateIndex
CREATE INDEX "files_campaignId_idx" ON "files"("campaignId");

-- CreateIndex
CREATE INDEX "files_agencyId_idx" ON "files"("agencyId");

-- CreateIndex
CREATE INDEX "files_folderId_idx" ON "files"("folderId");

-- CreateIndex
CREATE INDEX "gmv_transactions_campaignId_idx" ON "gmv_transactions"("campaignId");

-- CreateIndex
CREATE INDEX "members_brandId_idx" ON "members"("brandId");

-- CreateIndex
CREATE INDEX "tasks_campaignId_idx" ON "tasks"("campaignId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmv_transactions" ADD CONSTRAINT "gmv_transactions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creators" ADD CONSTRAINT "campaign_creators_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creators" ADD CONSTRAINT "campaign_creators_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_deliverables" ADD CONSTRAINT "campaign_deliverables_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_deliverables" ADD CONSTRAINT "campaign_deliverables_assignedCreatorId_fkey" FOREIGN KEY ("assignedCreatorId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_creatorMemberId_fkey" FOREIGN KEY ("creatorMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_invitations" ADD CONSTRAINT "brand_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_invitations" ADD CONSTRAINT "brand_invitations_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_invitations" ADD CONSTRAINT "brand_invitations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_invitations" ADD CONSTRAINT "brand_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_invitations" ADD CONSTRAINT "brand_invitations_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- RLS — enable + least-privilege SELECT policies for the 8 new Agency CRM
-- tables, same model as 20260805110000_agency_kiosk_rls / the Part A
-- community-feed migration: Prisma (postgres role) bypasses RLS and remains
-- the only write path; these policies only govern the anon/authenticated
-- Supabase Data API surface. Reuses rls.belongs_to_agency()/is_agency_admin()
-- defined in 20260805110000_agency_kiosk_rls — agencyId here points at the
-- same "agency = Member" identity those helpers already understand.
-- =============================================================================

ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_creators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_deliverables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."contract_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brand_invitations" ENABLE ROW LEVEL SECURITY;

-- A member connected to a brand as its portal contact (Member.brandId) can
-- read rows scoped to that brand — the Brand Contact portal's RLS-level
-- counterpart to canBrandContactViewCampaign() in the app layer.
create or replace function rls.belongs_to_brand(p_brand_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where "authUserId" = auth.uid() and "deletedAt" is null and status = 'ACTIVE'
      and "brandId" = p_brand_id
  );
$$;

grant execute on function rls.belongs_to_brand(uuid) to anon, authenticated;

create policy "agency team, connected creator, brand contact, or org admin can read campaigns"
on "campaigns" for select to authenticated
using (
  rls.belongs_to_agency("agencyId")
  or rls.belongs_to_brand("brandId")
  or exists (select 1 from campaign_creators cc where cc."campaignId" = campaigns.id and cc."creatorId" = rls.member_id())
  or (rls.is_admin() and "organizationId" = rls.org_id())
);

create policy "campaign participants can read campaign_creators"
on "campaign_creators" for select to authenticated
using (
  "creatorId" = rls.member_id()
  or exists (select 1 from campaigns c where c.id = "campaign_creators"."campaignId" and (rls.belongs_to_agency(c."agencyId") or rls.belongs_to_brand(c."brandId")))
);

create policy "campaign participants can read campaign_deliverables"
on "campaign_deliverables" for select to authenticated
using (
  "assignedCreatorId" = rls.member_id()
  or exists (select 1 from campaigns c where c.id = "campaign_deliverables"."campaignId" and (rls.belongs_to_agency(c."agencyId") or rls.belongs_to_brand(c."brandId")))
);

create policy "agency team, creator, brand contact, or org admin can read contracts"
on "contracts" for select to authenticated
using (
  rls.belongs_to_agency("agencyId")
  or "creatorMemberId" = rls.member_id()
  or ("brandId" is not null and rls.belongs_to_brand("brandId"))
  or (rls.is_admin() and "organizationId" = rls.org_id())
);

create policy "contract participants can read contract_versions"
on "contract_versions" for select to authenticated
using (
  exists (
    select 1 from contracts c
    where c.id = "contract_versions"."contractId"
      and (rls.belongs_to_agency(c."agencyId") or c."creatorMemberId" = rls.member_id())
  )
);

create policy "agency team, brand contact, or org admin can read invoices"
on "invoices" for select to authenticated
using (
  rls.belongs_to_agency("agencyId")
  or ("brandId" is not null and rls.belongs_to_brand("brandId"))
  or (rls.is_admin() and "organizationId" = rls.org_id())
);

create policy "agency team or org admin can read folders"
on "folders" for select to authenticated
using (rls.belongs_to_agency("agencyId") or (rls.is_admin() and "organizationId" = rls.org_id()));

create policy "agency team, invitee, or org admin can read brand_invitations"
on "brand_invitations" for select to authenticated
using (
  rls.belongs_to_agency("agencyId")
  or "acceptedById" = rls.member_id()
  or (rls.is_admin() and "organizationId" = rls.org_id())
);
