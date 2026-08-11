import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Mail } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompactCurrency } from "@/lib/utils/format";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { isAgencyAdmin } from "@/features/agencies/services/agency-access.service";
import { listCampaignsForBrand } from "@/features/agencies/services/campaign.service";
import { listBrandInvitations } from "@/features/agencies/services/brand-invitations.service";
import { canManageInvoices } from "@/features/agencies/config/agency-permissions";
import { CampaignStatusBadge, InvoiceStatusBadge } from "@/features/agencies/components/crm-status-badge";
import { BrandInviteDialog } from "@/features/agencies/components/brand-invite-dialog";
import { InvoiceFormDialog } from "@/features/agencies/components/invoice-form-dialog";
import { InvoiceStatusActions } from "@/features/agencies/components/invoice-status-actions";

export const dynamic = "force-dynamic";

export default async function AgencyBrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireCurrentMember();
  if (actor.role !== "AGENCY") redirect("/dashboard");

  const agencyId = effectiveAgencyIdFor(actor);

  const brand = await prisma.brand.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: { brandContacts: { select: { id: true, fullName: true, email: true } } },
  });
  if (!brand) notFound();

  const [campaigns, contracts, invoices, invitations] = await Promise.all([
    listCampaignsForBrand(actor.organizationId, id),
    prisma.contract.findMany({ where: { organizationId: actor.organizationId, agencyId, brandId: id }, orderBy: { createdAt: "desc" } }),
    prisma.invoice.findMany({ where: { organizationId: actor.organizationId, agencyId, brandId: id }, orderBy: { createdAt: "desc" } }),
    listBrandInvitations(actor.organizationId, id),
  ]);

  const canManage = isAgencyAdmin(actor, agencyId);
  const agencyCampaigns = campaigns.filter((c) => c.agencyId === agencyId);

  return (
    <div className="space-y-6">
      <Link href="/agency/brands" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Brands
      </Link>

      <PageHeader
        title={brand.name}
        description={brand.industry ?? "No industry set"}
        actions={canManage ? <BrandInviteDialog brandId={brand.id} /> : undefined}
      />

      {brand.notes && <p className="text-sm text-muted-foreground">{brand.notes}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Brand Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {brand.brandContacts.length === 0 && invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No portal contacts yet.</p>
            ) : (
              <ul className="space-y-2">
                {brand.brandContacts.map((contact) => (
                  <li key={contact.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                    <span className="text-sm font-medium">{contact.fullName}</span>
                    <span className="text-xs text-muted-foreground">{contact.email}</span>
                  </li>
                ))}
                {invitations
                  .filter((inv) => inv.status === "PENDING")
                  .map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-2.5">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="size-3.5" /> {inv.fullName}
                      </span>
                      <Badge variant="outline">Invited</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold tabular-nums">{agencyCampaigns.length}</p>
              <p className="text-xs text-muted-foreground">Campaigns</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{contracts.length}</p>
              <p className="text-xs text-muted-foreground">Contracts</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{invoices.length}</p>
              <p className="text-xs text-muted-foreground">Invoices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Campaigns</h2>
        {agencyCampaigns.length === 0 ? (
          <EmptyState icon={Mail} title="No campaigns yet" description="Create one from the Campaigns page." />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencyCampaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/agency/campaigns/${c.id}`} className="text-sm font-medium hover:underline">
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <CampaignStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatCompactCurrency(Number(c.budget))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Contracts</h2>
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contracts yet.</p>
        ) : (
          <ul className="space-y-2">
            {contracts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                <Link href={`/agency/contracts/${c.id}`} className="text-sm font-medium hover:underline">
                  {c.title}
                </Link>
                <span className="text-xs text-muted-foreground">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Invoices</h2>
          {canManageInvoices(actor.agencyRole) && (
            <InvoiceFormDialog brandId={brand.id} campaigns={agencyCampaigns.map((c) => ({ id: c.id, name: c.title }))} />
          )}
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <ul className="space-y-2">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{inv.invoiceNumber}</span>
                  <InvoiceStatusBadge status={inv.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatCompactCurrency(Number(inv.amount))} · due {format(inv.dueDate, "MMM d, yyyy")}
                  </span>
                </div>
                {canManageInvoices(actor.agencyRole) && <InvoiceStatusActions invoiceId={inv.id} status={inv.status} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
