import { redirect } from "next/navigation";
import { Clock, UserCheck, UserX, FileText } from "lucide-react";
import type { MemberRole, MembershipApplicationStatus } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { listApplications, getApplicationCounts } from "@/features/applications/services/applications.service";
import { ApplicationsFilters } from "@/features/applications/components/applications-filters";
import { ApplicationsTable, type ApplicationRow } from "@/features/applications/components/applications-table";
import { StatCard } from "@/components/shared/stat-card";
import { ExportReportButton } from "@/features/reports/components/export-report-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; role?: string; sort?: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.approve")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status = (params.status as MembershipApplicationStatus | undefined) ?? "PENDING";

  const [applications, counts] = await Promise.all([
    listApplications(actor.organizationId, {
      status,
      search: params.search,
      role: params.role as MemberRole | undefined,
      sort: params.sort as "newest" | "role" | undefined,
    }),
    getApplicationCounts(actor.organizationId),
  ]);

  const rows: ApplicationRow[] = applications.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    email: a.email,
    role: a.role,
    instagram: a.instagram,
    tiktok: a.tiktok,
    youtube: a.youtube,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    referralCode: a.referralLink?.referralCode ?? null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Applications</h1>
          <p className="text-sm text-muted-foreground">Review and act on membership applications submitted at /apply.</p>
        </div>
        {hasPermission(actor.systemRole, "reports.export") && (
          <ExportReportButton
            type="applications"
            label="Export Applications"
            queryParams={{ status, search: params.search, role: params.role }}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending Applications" value={String(counts.pending)} icon={Clock} accent="warning" />
        <StatCard label="Approved Today" value={String(counts.approvedToday)} icon={UserCheck} accent="success" />
        <StatCard label="Rejected Today" value={String(counts.rejectedToday)} icon={UserX} accent="danger" />
        <StatCard label="Total Applications" value={String(counts.total)} icon={FileText} />
      </div>

      <ApplicationsFilters />

      <ApplicationsTable data={rows} />
    </div>
  );
}
