import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  getLegalDashboardKpis,
  getDocumentManagementCards,
} from "@/features/legal/services/compliance.service";
import { listLegalAuditLogs } from "@/features/admin/services/audit-log.service";
import { LegalKpiGrid } from "@/features/legal/components/admin/legal-kpi-grid";
import { DocumentManagementCard } from "@/features/legal/components/admin/document-management-card";
import { LegalAuditLogTable } from "@/features/legal/components/admin/legal-audit-log-table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Legal" };

export default async function AdminLegalPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "legal.manage")) redirect("/dashboard");

  const [kpis, documents, auditLogs] = await Promise.all([
    getLegalDashboardKpis(actor.organizationId),
    getDocumentManagementCards(actor.organizationId),
    listLegalAuditLogs(actor.organizationId, 25),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Legal"
        description="Manage legal documents, publish new versions, and track member compliance across the platform."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/legal/compliance">Compliance dashboard</Link>
            </Button>
          </div>
        }
      />

      <LegalKpiGrid kpis={kpis} />

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Documents</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {documents.map((doc) => (
            <DocumentManagementCard key={doc.documentType} doc={doc} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Recent Legal Activity</h2>
        <LegalAuditLogTable logs={auditLogs} />
      </div>
    </div>
  );
}
