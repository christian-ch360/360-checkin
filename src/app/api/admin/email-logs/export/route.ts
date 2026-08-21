import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import type { EmailCategory, EmailStatus, Prisma } from "@prisma/client";
import { exportToCSV, exportToXLSX } from "@/features/reports/services/export";
import type { ReportTable } from "@/features/reports/services/reports.service";
import { EMAIL_CATEGORY_LABELS, EMAIL_STATUS_LABELS } from "@/features/communications/config/template-catalog";
import { getInboxCutoff } from "@/features/communications/services/email-logs.service";

const CONTENT_TYPES = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

const MAX_ROWS = 10_000;

export async function GET(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member || !hasPermission(member.systemRole, "communications.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const search = params.get("search") || undefined;
  const template = params.get("template") || undefined;
  const category = (params.get("category") as EmailCategory | null) || undefined;
  const status = (params.get("status") as EmailStatus | null) || undefined;
  const dateFrom = params.get("from") ? new Date(params.get("from")!) : undefined;
  const dateTo = params.get("to") ? new Date(params.get("to")!) : undefined;
  const view = (params.get("view") as "inbox" | "archive" | null) || undefined;
  const exportFormat = (params.get("format") ?? "csv") as keyof typeof CONTENT_TYPES;

  if (!(exportFormat in CONTENT_TYPES)) {
    return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  }

  // Separate AND entries (matching buildEmailLogWhere in email-logs.service.ts)
  // so the dateFrom/dateTo range and the Inbox/Archive cutoff don't collide
  // on the same `createdAt` key. A search bypasses the cutoff, same as the list view.
  const and: Prisma.EmailLogWhereInput[] = [];
  if (dateFrom) and.push({ createdAt: { gte: dateFrom } });
  if (dateTo) and.push({ createdAt: { lte: dateTo } });
  if (view && !search) {
    const cutoff = getInboxCutoff();
    and.push(view === "inbox" ? { createdAt: { gte: cutoff } } : { createdAt: { lt: cutoff } });
  }
  if (search) {
    and.push({
      OR: [
        { to: { contains: search, mode: "insensitive" } },
        { recipientName: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.EmailLogWhereInput = {
    organizationId: member.organizationId,
    ...(template ? { template } : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(and.length ? { AND: and } : {}),
  };

  const logs = await prisma.emailLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    select: {
      to: true,
      recipientName: true,
      subject: true,
      template: true,
      category: true,
      status: true,
      provider: true,
      providerId: true,
      attempts: true,
      error: true,
      createdAt: true,
      deliveredAt: true,
      member: { select: { fullName: true } },
      sentBy: { select: { fullName: true } },
    },
  });

  const table: ReportTable = {
    title: "Email Logs",
    columns: [
      { key: "recipientName", label: "Member Name" },
      { key: "to", label: "Email Address" },
      { key: "subject", label: "Subject" },
      { key: "template", label: "Template" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
      { key: "sentBy", label: "Sent By" },
      { key: "sentDate", label: "Sent Date" },
      { key: "provider", label: "Provider" },
      { key: "providerId", label: "Resend Email ID" },
      { key: "attempts", label: "Retry Count" },
      { key: "error", label: "Error Message" },
    ],
    rows: logs.map((log) => ({
      recipientName: log.recipientName ?? log.member?.fullName ?? "",
      to: log.to,
      subject: log.subject,
      template: log.template,
      category: EMAIL_CATEGORY_LABELS[log.category],
      status: EMAIL_STATUS_LABELS[log.status],
      sentBy: log.sentBy?.fullName ?? "System",
      sentDate: format(log.createdAt, "yyyy-MM-dd HH:mm"),
      provider: log.provider,
      providerId: log.providerId ?? "",
      attempts: log.attempts,
      error: log.error ?? "",
    })),
  };

  const body = exportFormat === "csv" ? exportToCSV(table) : exportToXLSX(table);
  const filename = `email-logs-${new Date().toISOString().slice(0, 10)}.${exportFormat}`;

  return new NextResponse(new Uint8Array(Buffer.isBuffer(body) ? body : Buffer.from(body)), {
    headers: {
      "Content-Type": CONTENT_TYPES[exportFormat],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
