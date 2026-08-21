import type { EmailCategory, EmailStatus } from "@prisma/client";
import { EmailLogFilters } from "@/features/communications/components/email-log-filters";
import { EmailLogTable } from "@/features/communications/components/email-log-table";
import { Pagination } from "@/components/shared/pagination";
import { listEmailLogs } from "@/features/communications/services/email-logs.service";
import { TEMPLATE_CATEGORY } from "@/features/communications/config/template-catalog";
import type { TemplateName } from "@/lib/email/email-types";

const TEMPLATE_NAMES = Object.keys(TEMPLATE_CATEGORY) as TemplateName[];
const PAGE_SIZE = 25;

export type EmailCenterSearchParams = {
  page?: string;
  search?: string;
  template?: string;
  category?: string;
  status?: string;
  from?: string;
  to?: string;
};

export async function EmailCenterListSection({
  organizationId,
  canManage,
  view,
  searchParams,
}: {
  organizationId: string;
  canManage: boolean;
  view: "inbox" | "archive";
  searchParams: EmailCenterSearchParams;
}) {
  const filters = {
    search: searchParams.search,
    template: searchParams.template,
    category: searchParams.category as EmailCategory | undefined,
    status: searchParams.status as EmailStatus | undefined,
    dateFrom: searchParams.from ? new Date(searchParams.from) : undefined,
    dateTo: searchParams.to ? new Date(`${searchParams.to}T23:59:59`) : undefined,
    view,
  };
  const page = Math.max(1, Number(searchParams.page) || 1);

  const { items, total, pageCount } = await listEmailLogs(organizationId, filters, { page, pageSize: PAGE_SIZE });

  // A search escapes the Inbox/Archive time boundary (see buildEmailLogWhere),
  // so results can include matches from the other side — the label reflects that.
  const scopeLabel = filters.search
    ? "Search results span all emails, including Archive"
    : view === "inbox"
      ? "Showing emails from the last 30 days"
      : "Emails older than 30 days";

  return (
    <div className="space-y-4">
      <EmailLogFilters templates={TEMPLATE_NAMES} />
      <p className="text-xs text-muted-foreground">{scopeLabel}</p>
      <EmailLogTable items={items} canManage={canManage} />
      <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
