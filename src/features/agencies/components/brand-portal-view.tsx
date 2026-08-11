import { format } from "date-fns";
import { Megaphone, FileSignature, Receipt, Building2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompactCurrency } from "@/lib/utils/format";
import {
  CampaignStatusBadge,
  DeliverableStatusBadge,
  ContractStatusBadge,
  InvoiceStatusBadge,
} from "@/features/agencies/components/crm-status-badge";
import { DeliverableReviewButtons } from "@/features/agencies/components/deliverable-review-buttons";
import type { BrandPortalOverview } from "@/features/agencies/services/brand-portal.service";

export function BrandPortalView({ overview }: { overview: BrandPortalOverview }) {
  const { brand, campaigns, contracts, invoices } = overview;
  if (!brand) return null;

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const outstandingInvoices = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length;

  return (
    <div className="space-y-8">
      <PageHeader title={brand.name} description="Your campaigns, contracts, and invoices with this agency." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active Campaigns" value={String(activeCampaigns)} icon={Megaphone} />
        <StatCard label="Contracts" value={String(contracts.length)} icon={FileSignature} />
        <StatCard
          label="Outstanding Invoices"
          value={String(outstandingInvoices)}
          icon={Receipt}
          accent={outstandingInvoices > 0 ? "warning" : "default"}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Campaigns</h2>
        {campaigns.length === 0 ? (
          <EmptyState icon={Megaphone} title="No campaigns yet" description="Campaigns your agency creates for you will appear here." />
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold">{campaign.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Budget {formatCompactCurrency(Number(campaign.budget))}
                    </p>
                  </div>
                  <CampaignStatusBadge status={campaign.status} />
                </CardHeader>
                <CardContent>
                  {campaign.deliverables.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deliverables yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {campaign.deliverables.map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                          <div>
                            <p className="text-sm font-medium">{d.title}</p>
                            {d.dueDate && (
                              <p className="text-xs text-muted-foreground">Due {format(d.dueDate, "MMM d, yyyy")}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {d.status === "SUBMITTED" ? (
                              <DeliverableReviewButtons deliverableId={d.id} />
                            ) : (
                              <DeliverableStatusBadge status={d.status} />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Contracts</h2>
        {contracts.length === 0 ? (
          <EmptyState icon={FileSignature} title="No contracts yet" description="Contracts your agency sends will appear here." />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">
                      <a href={c.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        {c.title}
                      </a>
                    </TableCell>
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

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Invoices</h2>
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" description="Invoices from your agency will appear here." />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.campaign?.title ?? "—"}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(inv.dueDate, "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatCompactCurrency(Number(inv.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <Building2 className="size-4 shrink-0" />
        You have read-only portal access to {brand.name}. Deliverable approvals above are your one write action — everything else is managed by your agency contact.
      </div>
    </div>
  );
}
