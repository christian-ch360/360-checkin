import { redirect } from "next/navigation";
import type { LegalDocumentType, MemberRole } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { listComplianceRows, type ComplianceStatus } from "@/features/legal/services/compliance.service";
import { ComplianceFilters } from "@/features/legal/components/admin/compliance-filters";
import { ComplianceTable } from "@/features/legal/components/admin/compliance-table";
import { ExportComplianceButton } from "@/features/legal/components/admin/export-compliance-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Legal Compliance" };

export default async function AdminLegalCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; document?: string; search?: string; from?: string; to?: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "legal.manage")) redirect("/dashboard");

  const params = await searchParams;
  const rows = await listComplianceRows(actor.organizationId, {
    role: params.role && params.role !== "all" ? (params.role as MemberRole) : undefined,
    status: params.status && params.status !== "all" ? (params.status as ComplianceStatus) : undefined,
    documentType: params.document && params.document !== "all" ? (params.document as LegalDocumentType) : undefined,
    search: params.search,
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Legal Compliance"
        description="Every member's acceptance status across all required legal documents."
        actions={<ExportComplianceButton />}
      />

      <ComplianceFilters />

      <ComplianceTable data={rows} canForceReaccept={hasPermission(actor.systemRole, "legal.publish")} />
    </div>
  );
}
