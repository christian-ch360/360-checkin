-- Admin-editable email template content, layered on top of (never
-- replacing) the 51 code-defined React Email templates. See the model
-- comment in schema.prisma for the override semantics.
CREATE TYPE "EmailTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

CREATE TABLE "public"."email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "templateKey" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "EmailCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "status" "EmailTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_templates_organizationId_templateKey_key" ON "public"."email_templates"("organizationId", "templateKey");
CREATE INDEX "email_templates_organizationId_status_idx" ON "public"."email_templates"("organizationId", "status");
CREATE INDEX "email_templates_organizationId_category_idx" ON "public"."email_templates"("organizationId", "category");

ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- RLS — same model as email_logs (20260723210000_least_privilege_rls_policies):
-- Prisma (postgres role) bypasses RLS and remains the only write path; this
-- is a SELECT-only policy governing the anon/authenticated Supabase Data API
-- surface, admin-read-only since template content is an admin-only concern.
-- =============================================================================
ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;

create policy "admin can read org email templates"
on "email_templates" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());
