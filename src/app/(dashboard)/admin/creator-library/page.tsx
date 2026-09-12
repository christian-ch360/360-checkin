import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, MapPin, TrendingUp, Users, Upload } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { formatCompactNumber } from "@/lib/utils/format";
import { getLibraryStats } from "@/features/creator-library/services/creator-library.service";
import { getLibrarySettings } from "@/features/creator-library/lib/library-settings";
import {
  getAdminLibrarySummary,
  listAdminCreators,
  type AdminCreatorFilter,
} from "@/features/creator-library/services/creator-library-admin.service";
import { AdminLibraryTable } from "@/features/creator-library/admin/admin-library-table";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";
import { AdminAddCreatorDialog } from "@/features/creator-library/admin/admin-add-creator-dialog";

export const dynamic = "force-dynamic";

export const metadata = { title: "Creator Library" };

const VALID_FILTERS: AdminCreatorFilter[] = ["all", "published", "hidden", "featured", "standalone", "not_in_library"];

export default async function AdminCreatorLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const filter = VALID_FILTERS.find((entry) => entry === params.filter) ?? "all";
  const search = params.q?.trim() ?? "";

  const [stats, summary, rows, settings] = await Promise.all([
    getLibraryStats(actor.organizationId),
    getAdminLibrarySummary(actor.organizationId),
    listAdminCreators(actor.organizationId, { search, filter }),
    getLibrarySettings(actor.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <PageHeader
        title="Creator Library"
        description="Manage, organize, and showcase the CreatorHub360 Creator Network."
        actions={
          <div className="flex gap-2">
            <AdminAddCreatorDialog />
            <Button asChild variant="outline">
              <Link href="/admin/creator-library/import">
                <Upload className="size-4" />
                Import CSV
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="/creator-library" target="_blank" rel="noopener noreferrer">
                Open library
              </a>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total creators" value={formatCompactNumber(summary.profiles)} icon={Users} />
        <StatCard
          label="Combined reach"
          value={stats.combinedFollowers > 0 ? formatCompactNumber(stats.combinedFollowers) : "—"}
          icon={TrendingUp}
          accent="primary"
        />
        <StatCard
          label="Countries"
          value={stats.countries > 0 ? String(stats.countries) : "—"}
          icon={Building2}
          accent="success"
        />
        <StatCard label="Cities" value={stats.cities > 0 ? String(stats.cities) : "—"} icon={MapPin} accent="warning" />
      </div>

      <AdminLibraryTable rows={rows} filter={filter} search={search} placeholderIconUrl={settings.placeholderIconUrl} />
    </div>
  );
}
