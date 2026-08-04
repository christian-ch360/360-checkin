import Link from "next/link";
import { Building2, FolderKanban, Tags, Users } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listCompanies } from "@/features/companies/services/companies.service";
import { hasPermission } from "@/lib/permissions";
import { CompanyFormDialog } from "@/features/companies/components/company-form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const actor = await requireCurrentMember();
  const canManage = hasPermission(actor.systemRole, "projects.manage");
  const companies = await listCompanies(actor.organizationId);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Companies</h1>
          <p className="text-sm text-muted-foreground">Clients, agencies, and partner organizations.</p>
        </div>
        {canManage && <CompanyFormDialog />}
      </div>

      {companies.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No companies yet.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card className="h-full border shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-4.5" />
                  </div>
                  <p className="mt-3 font-medium">{c.name}</p>
                  {c.website && <p className="truncate text-xs text-muted-foreground">{c.website}</p>}
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" /> {c._count.members}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tags className="size-3.5" /> {c._count.brands}
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderKanban className="size-3.5" /> {c._count.projects}
                    </span>
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
