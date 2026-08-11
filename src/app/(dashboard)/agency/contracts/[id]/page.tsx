import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, FileText } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canManageContracts, canDeleteContract } from "@/features/agencies/config/agency-permissions";
import { getContract } from "@/features/agencies/services/contract.service";
import { ContractStatusBadge } from "@/features/agencies/components/crm-status-badge";
import { ContractDetailActions } from "@/features/agencies/components/contract-detail-actions";

export const dynamic = "force-dynamic";

export default async function AgencyContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireCurrentMember();
  if (actor.role !== "AGENCY") redirect("/dashboard");

  const agencyId = effectiveAgencyIdFor(actor);
  const contract = await getContract(actor.organizationId, id);
  if (!contract || contract.agencyId !== agencyId) notFound();

  return (
    <div className="space-y-6">
      <Link href="/agency/contracts" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Contracts
      </Link>

      <PageHeader
        title={contract.title}
        description={[contract.brand?.name, contract.campaign?.title].filter(Boolean).join(" · ") || "No linked brand or campaign"}
        actions={<ContractStatusBadge status={contract.status} />}
      />

      <ContractDetailActions
        contractId={id}
        status={contract.status}
        canManage={canManageContracts(actor.agencyRole)}
        canDelete={canDeleteContract(actor.agencyRole)}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current file</span>
              <a href={contract.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <FileText className="size-3.5" /> {contract.fileName}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span>{contract.expiresAt ? format(contract.expiresAt, "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sent</span>
              <span>{contract.sentAt ? format(contract.sentAt, "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Signed</span>
              <span>{contract.signedAt ? format(contract.signedAt, "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DocuSign envelope</span>
              <span className="font-mono text-xs">{contract.docusignEnvelopeId ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created by</span>
              <span>{contract.createdBy.fullName}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contract.versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm">
                  <a href={v.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    v{v.versionNumber} — {v.fileName}
                  </a>
                  <span className="text-xs text-muted-foreground">{format(v.createdAt, "MMM d, yyyy")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
