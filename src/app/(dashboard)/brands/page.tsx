import Link from "next/link";
import { Tags, FolderKanban } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listBrands } from "@/features/brands/services/brands.service";
import { listCompaniesForOrg } from "@/features/members/services/members.service";
import { hasPermission } from "@/lib/permissions";
import { BrandFormDialog } from "@/features/brands/components/brand-form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Brands" };

export default async function BrandsPage() {
  const actor = await requireCurrentMember();
  const canManage = hasPermission(actor.systemRole, "projects.manage");
  const [brands, companies] = await Promise.all([
    listBrands(actor.organizationId),
    listCompaniesForOrg(actor.organizationId),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Brands</h1>
          <p className="text-sm text-muted-foreground">Brands running campaigns across CreatorHub360.</p>
        </div>
        {canManage && <BrandFormDialog companies={companies} />}
      </div>

      {brands.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No brands yet.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Link key={b.id} href={`/brands/${b.id}`}>
              <Card className="h-full border shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Tags className="size-4.5" />
                  </div>
                  <p className="mt-3 font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.company?.name ?? "Independent"}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <FolderKanban className="size-3.5" /> {b._count.projects} projects
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
