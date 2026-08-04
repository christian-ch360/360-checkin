import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getCompanyDetail } from "@/features/companies/services/companies.service";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectStatusBadge } from "@/features/projects/components/project-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, DollarSign, FolderKanban, Tags, Users } from "lucide-react";
import { formatCompactCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireCurrentMember();
  const detail = await getCompanyDetail(actor.organizationId, id);
  if (!detail) notFound();

  const { company, totalGMV } = detail;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{company.name}</h1>
          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">
              {company.website}
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total GMV" value={formatCompactCurrency(totalGMV)} icon={DollarSign} accent="success" />
        <StatCard label="Members" value={String(company.members.length)} icon={Users} />
        <StatCard label="Brands" value={String(company.brands.length)} icon={Tags} />
        <StatCard label="Projects" value={String(company.projects.length)} icon={FolderKanban} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Brands</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {company.brands.length === 0 ? (
              <p className="text-sm text-muted-foreground">No brands yet.</p>
            ) : (
              company.brands.map((b) => (
                <Link key={b.id} href={`/brands/${b.id}`} className="block text-sm hover:underline">
                  {b.name}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              company.members.map((m) => (
                <Link key={m.id} href={`/members/${m.id}`} className="flex items-center gap-2 text-sm hover:underline">
                  <Avatar className="size-6">
                    {m.profilePhotoUrl && <AvatarImage src={m.profilePhotoUrl} />}
                    <AvatarFallback className="text-[10px]">{initials(m.fullName)}</AvatarFallback>
                  </Avatar>
                  {m.fullName}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {company.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              company.projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between text-sm hover:underline">
                  <span>{p.name}</span>
                  <ProjectStatusBadge status={p.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
