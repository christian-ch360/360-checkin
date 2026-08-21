import { redirect } from "next/navigation";
import { Clock, UserCheck, UserX, FileText } from "lucide-react";
import type { MemberRole, MembershipApplicationStatus } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { listApplications, getApplicationCounts } from "@/features/applications/services/applications.service";
import { ApplicationsFilters } from "@/features/applications/components/applications-filters";
import { ApplicationsTable, type ApplicationRow } from "@/features/applications/components/applications-table";
import { ApplicationsPagination } from "@/features/applications/components/applications-pagination";
import { StatCard } from "@/components/shared/stat-card";
import { ExportReportButton } from "@/features/reports/components/export-report-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Applications" };

const PAGE_SIZE_OPTIONS = new Set([25, 50, 100]);
const DEFAULT_PAGE_SIZE = 25;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; role?: string; sort?: string; page?: string; limit?: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.approve")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status = (params.status as MembershipApplicationStatus | undefined) ?? "PENDING";
  const page = Math.max(1, Number(params.page) || 1);
  const requestedLimit = Number(params.limit);
  const pageSize = PAGE_SIZE_OPTIONS.has(requestedLimit) ? requestedLimit : DEFAULT_PAGE_SIZE;

  const [{ items: applications, total, pageCount }, counts] = await Promise.all([
    listApplications(
      actor.organizationId,
      {
        status,
        search: params.search,
        role: params.role as MemberRole | undefined,
        sort: params.sort as "newest" | "role" | undefined,
      },
      { page, pageSize }
    ),
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

      {/* A `page` beyond pageCount (stale URL after the list shrinks, or a
          hand-edited query string) still fetches correctly — Prisma's skip
          just returns an empty page — but clamping here keeps the "Showing
          X-Y of Z" label and active page button sane instead of computing
          off the out-of-range requested page. */}
      <ApplicationsPagination page={Math.min(page, pageCount)} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}
