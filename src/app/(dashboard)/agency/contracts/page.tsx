import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { FileSignature } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canManageContracts } from "@/features/agencies/config/agency-permissions";
import { listContracts } from "@/features/agencies/services/contract.service";
import { listCampaigns } from "@/features/agencies/services/campaign.service";
import { listBrandsForAgency } from "@/features/brands/services/brands.service";
import { ContractStatusBadge } from "@/features/agencies/components/crm-status-badge";
import { ContractFormDialog } from "@/features/agencies/components/contract-form-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contracts" };

export default async function AgencyContractsPage() {
  const actor = await requireCurrentMember();
  if (actor.role !== "AGENCY") redirect("/dashboard");

  const agencyId = effectiveAgencyIdFor(actor);
  const [contracts, campaigns, brands] = await Promise.all([
    listContracts(actor.organizationId, agencyId),
    listCampaigns(actor.organizationId, agencyId),
    listBrandsForAgency(actor.organizationId, agencyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Upload, version, e-sign, and track expirations."
        actions={
          canManageContracts(actor.agencyRole) ? (
            <ContractFormDialog
              campaigns={campaigns.map((c) => ({ id: c.id, name: c.title }))}
              brands={brands.map((b) => ({ id: b.id, name: b.name }))}
            />
          ) : undefined
        }
      />

      {contracts.length === 0 ? (
        <EmptyState icon={FileSignature} title="No contracts yet" description="Upload a contract to start tracking status and expiration." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/agency/contracts/${c.id}`} className="text-sm font-medium hover:underline">
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.brand?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.campaign?.title ?? "—"}</TableCell>
                  <TableCell>
                    <ContractStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {c.expiresAt ? format(c.expiresAt, "MMM d, yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
