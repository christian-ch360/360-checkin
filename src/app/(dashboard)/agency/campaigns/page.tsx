import { redirect } from "next/navigation";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompactCurrency } from "@/lib/utils/format";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canManageCampaigns } from "@/features/agencies/config/agency-permissions";
import { listCampaigns } from "@/features/agencies/services/campaign.service";
import { listBrandsForAgency } from "@/features/brands/services/brands.service";
import { CampaignStatusBadge } from "@/features/agencies/components/crm-status-badge";
import { CampaignFormDialog } from "@/features/agencies/components/campaign-form-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns" };

export default async function AgencyCampaignsPage() {
  const actor = await requireCurrentMember();
  if (actor.role !== "AGENCY") redirect("/dashboard");

  const agencyId = effectiveAgencyIdFor(actor);
  const [campaigns, brands] = await Promise.all([
    listCampaigns(actor.organizationId, agencyId),
    listBrandsForAgency(actor.organizationId, agencyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Brand deals — creators, deliverables, approvals, and timelines."
        actions={canManageCampaigns(actor.agencyRole) ? <CampaignFormDialog brands={brands.map((b) => ({ id: b.id, name: b.name }))} /> : undefined}
      />

      {campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Create a campaign to start tracking a brand deal." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Creators</TableHead>
                <TableHead>Deliverables</TableHead>
                <TableHead className="text-right">Budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Link href={`/agency/campaigns/${campaign.id}`} className="text-sm font-medium hover:underline">
                      {campaign.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{campaign.brand.name}</TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={campaign.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{campaign.creators.length}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{campaign.deliverables.length}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">
                    {formatCompactCurrency(Number(campaign.budget))}
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
