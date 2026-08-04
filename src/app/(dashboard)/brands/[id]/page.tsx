import { notFound } from "next/navigation";
import Link from "next/link";
import { Tags, DollarSign, FolderKanban } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getBrandDetail } from "@/features/brands/services/brands.service";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectStatusBadge } from "@/features/projects/components/project-status-badge";
import { QRCodeDisplay } from "@/features/qr/components/qr-code-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireCurrentMember();
  const detail = await getBrandDetail(actor.organizationId, id);
  if (!detail) notFound();

  const { brand, totalGMV } = detail;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Tags className="size-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{brand.name}</h1>
          {brand.company && (
            <Link href={`/companies/${brand.company.id}`} className="text-sm text-muted-foreground hover:underline">
              {brand.company.name}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total GMV" value={formatCompactCurrency(totalGMV)} icon={DollarSign} accent="success" />
        <StatCard label="Projects" value={String(brand.projects.length)} icon={FolderKanban} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {brand.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects yet.</p>
              ) : (
                brand.projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span>{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCompactCurrency(Number(p.gmv))}</span>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {brand.qrAsset && <QRCodeDisplay token={brand.qrAsset.token} label={brand.name} />}

        {brand.description && (
          <Card className="lg:col-start-3">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{brand.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
