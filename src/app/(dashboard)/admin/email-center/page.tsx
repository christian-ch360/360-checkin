import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import type { EmailCategory, EmailStatus } from "@prisma/client";
import { listEmailLogs, getEmailLogKPIs } from "@/features/communications/services/email-logs.service";
import { TEMPLATE_CATEGORY } from "@/features/communications/config/template-catalog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { EmailCenterKpis } from "@/features/communications/components/email-center-kpis";
import { EmailLogFilters } from "@/features/communications/components/email-log-filters";
import { EmailLogTable } from "@/features/communications/components/email-log-table";
import { ExportEmailLogsButton } from "@/features/communications/components/export-email-logs-button";
import type { TemplateName } from "@/lib/email/email-types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Email Center" };

const TEMPLATE_NAMES = Object.keys(TEMPLATE_CATEGORY) as TemplateName[];
const PAGE_SIZE = 25;

export default async function EmailCenterPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    template?: string;
    category?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    redirect("/dashboard");
  }
  const canManage = hasPermission(actor.systemRole, "communications.manage");

  const params = await searchParams;
  const filters = {
    search: params.search,
    template: params.template,
    category: params.category as EmailCategory | undefined,
    status: params.status as EmailStatus | undefined,
    dateFrom: params.from ? new Date(params.from) : undefined,
    dateTo: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
  };
  const page = Math.max(1, Number(params.page) || 1);

  const [{ items, total, pageCount }, kpis] = await Promise.all([
    listEmailLogs(actor.organizationId, filters, { page, pageSize: PAGE_SIZE }),
    getEmailLogKPIs(actor.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Center"
        description="View, search, inspect, retry, and monitor every email sent by the platform."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/email-center/analytics">
                <BarChart3 className="size-4" />
                Analytics
              </Link>
            </Button>
            {canManage && <ExportEmailLogsButton />}
          </div>
        }
      />

      <EmailCenterKpis kpis={kpis} />

      <EmailLogFilters templates={TEMPLATE_NAMES} />

      <EmailLogTable items={items} canManage={canManage} />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
