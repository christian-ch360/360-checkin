import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { listBrandsForAgency } from "@/features/brands/services/brands.service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brands" };

export default async function AgencyBrandsPage() {
  const actor = await requireCurrentMember();
  if (actor.role !== "AGENCY") redirect("/dashboard");

  const agencyId = effectiveAgencyIdFor(actor);
  const brands = await listBrandsForAgency(actor.organizationId, agencyId);

  return (
    <div className="space-y-6">
      <PageHeader title="Brands" description="Companies you've run campaigns, contracts, or invoices with." />

      {brands.length === 0 ? (
        <EmptyState icon={Briefcase} title="No brands yet" description="Brands appear here once you create a campaign, contract, or invoice for them." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead className="text-right">Campaigns</TableHead>
                <TableHead className="text-right">Contracts</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <Link href={`/agency/brands/${brand.id}`} className="text-sm font-medium hover:underline">
                      {brand.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{brand.industry ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {brand.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{brand.brandContacts.length}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{brand._count.campaigns}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{brand._count.contracts}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{brand._count.invoices}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
