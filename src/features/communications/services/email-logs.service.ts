import "server-only";

import { startOfDay, subDays } from "date-fns";
import type { EmailCategory, EmailStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type EmailLogFilters = {
  search?: string;
  template?: string;
  category?: EmailCategory;
  status?: EmailStatus;
  dateFrom?: Date;
  dateTo?: Date;
  /** Scopes the query to Inbox (created within INBOX_RETENTION_DAYS) or
   * Archive (older), via the same `createdAt` timestamp already used for
   * sorting and the dateFrom/dateTo filter. Ignored when `search` is set —
   * a search is meant to find a match on either side of the boundary
   * regardless of which tab it was typed from (see listEmailLogs). */
  view?: "inbox" | "archive";
};

export type EmailLogPage = {
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE_SIZE = 25;

export const INBOX_RETENTION_DAYS = 30;

/**
 * Exact instant, not a calendar-day boundary: an email created at precisely
 * this instant belongs to Inbox (`createdAt >= cutoff`); everything strictly
 * older is Archive (`createdAt < cutoff`). Mutually exclusive and exhaustive,
 * so no email can appear in both or neither. Recomputed on every call (never
 * cached) so it always reflects "now" — Date/Prisma's `timestamptz` both
 * operate on the same absolute instant regardless of server timezone, so
 * this needs no separate timezone handling.
 */
export function getInboxCutoff(): Date {
  return subDays(new Date(), INBOX_RETENTION_DAYS);
}

// Every column except html/text — those are large (@db.Text) and only ever
// needed by the detail drawer's lazy fetch (getEmailLogDetail), never the
// list view, to keep the table fast at thousands of rows.
const LIST_SELECT = {
  id: true,
  to: true,
  recipientName: true,
  subject: true,
  template: true,
  category: true,
  status: true,
  provider: true,
  providerId: true,
  error: true,
  attempts: true,
  deliveredAt: true,
  openedAt: true,
  clickedAt: true,
  bouncedAt: true,
  failedAt: true,
  createdAt: true,
  updatedAt: true,
  member: { select: { id: true, fullName: true, email: true } },
  sentBy: { select: { id: true, fullName: true } },
} satisfies Prisma.EmailLogSelect;

export type EmailLogListItem = Prisma.EmailLogGetPayload<{ select: typeof LIST_SELECT }>;

function buildEmailLogWhere(organizationId: string, filters: EmailLogFilters): Prisma.EmailLogWhereInput {
  // Separate AND entries (rather than one merged `createdAt` object) so the
  // dateFrom/dateTo range filter and the Inbox/Archive cutoff can both apply
  // at once without their `gte`/`lt` keys colliding.
  const and: Prisma.EmailLogWhereInput[] = [];

  if (filters.dateFrom) and.push({ createdAt: { gte: filters.dateFrom } });
  if (filters.dateTo) and.push({ createdAt: { lte: filters.dateTo } });

  if (filters.view && !filters.search) {
    const cutoff = getInboxCutoff();
    and.push(filters.view === "inbox" ? { createdAt: { gte: cutoff } } : { createdAt: { lt: cutoff } });
  }

  if (filters.search) {
    and.push({
      OR: [
        { to: { contains: filters.search, mode: "insensitive" } },
        { recipientName: { contains: filters.search, mode: "insensitive" } },
        { subject: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  return {
    organizationId,
    ...(filters.template ? { template: filters.template } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(and.length ? { AND: and } : {}),
  };
}

export async function listEmailLogs(
  organizationId: string,
  filters: EmailLogFilters = {},
  pagination: EmailLogPage = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
) {
  const where = buildEmailLogWhere(organizationId, filters);
  const page = Math.max(1, pagination.page);
  const pageSize = pagination.pageSize;

  const [items, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: LIST_SELECT,
    }),
    prisma.emailLog.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** The only query that selects html/text — used exclusively by the detail drawer's lazy on-open fetch. */
export async function getEmailLogDetail(organizationId: string, id: string) {
  return prisma.emailLog.findFirst({
    where: { id, organizationId },
    include: {
      member: { select: { id: true, fullName: true, email: true } },
      sentBy: { select: { id: true, fullName: true } },
    },
  });
}

export type EmailLogKPIs = {
  totalSent: number;
  sentToday: number;
  delivered: number;
  pending: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  trend: { totalSent: { value: string; positive: boolean }; deliveryRate: { value: string; positive: boolean } };
};

/**
 * "Delivered" here means status SENT or DELIVERED — Resend's synchronous
 * API only confirms hand-off, not real delivery, so SENT is the best signal
 * available until a future webhook starts setting DELIVERED/openedAt/
 * clickedAt for real (open/click rate will read 0% until then, which is
 * correct, not broken).
 */
export async function getEmailLogKPIs(organizationId: string): Promise<EmailLogKPIs> {
  const todayStart = startOfDay(new Date());
  const last7Start = startOfDay(subDays(new Date(), 7));
  const prior7Start = startOfDay(subDays(new Date(), 14));

  const [total, sentToday, delivered, pending, failed, opened, clicked, last7Total, last7Delivered, prior7Total, prior7Delivered] =
    await Promise.all([
      prisma.emailLog.count({ where: { organizationId } }),
      prisma.emailLog.count({ where: { organizationId, createdAt: { gte: todayStart } } }),
      prisma.emailLog.count({ where: { organizationId, status: { in: ["SENT", "DELIVERED"] } } }),
      prisma.emailLog.count({ where: { organizationId, status: { in: ["QUEUED", "RETRYING"] } } }),
      prisma.emailLog.count({ where: { organizationId, status: { in: ["FAILED", "BOUNCED", "COMPLAINED"] } } }),
      prisma.emailLog.count({ where: { organizationId, openedAt: { not: null } } }),
      prisma.emailLog.count({ where: { organizationId, clickedAt: { not: null } } }),
      prisma.emailLog.count({ where: { organizationId, createdAt: { gte: last7Start } } }),
      prisma.emailLog.count({
        where: { organizationId, createdAt: { gte: last7Start }, status: { in: ["SENT", "DELIVERED"] } },
      }),
      prisma.emailLog.count({ where: { organizationId, createdAt: { gte: prior7Start, lt: last7Start } } }),
      prisma.emailLog.count({
        where: { organizationId, createdAt: { gte: prior7Start, lt: last7Start }, status: { in: ["SENT", "DELIVERED"] } },
      }),
    ]);

  const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
  const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;

  const priorDeliveryRate = prior7Total > 0 ? (prior7Delivered / prior7Total) * 100 : 0;
  const last7DeliveryRate = last7Total > 0 ? (last7Delivered / last7Total) * 100 : 0;

  return {
    totalSent: total,
    sentToday,
    delivered,
    pending,
    failed,
    deliveryRate,
    openRate,
    clickRate,
    trend: {
      totalSent: trendOf(last7Total, prior7Total),
      deliveryRate: trendOf(last7DeliveryRate, priorDeliveryRate),
    },
  };
}

function trendOf(current: number, prior: number): { value: string; positive: boolean } {
  if (prior === 0) return { value: current > 0 ? "new this week" : "no change", positive: current >= 0 };
  const delta = ((current - prior) / prior) * 100;
  return { value: `${Math.abs(delta).toFixed(0)}% vs. last week`, positive: delta >= 0 };
}
