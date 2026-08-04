import { NextResponse, type NextRequest } from "next/server";
import type { LegalDocumentType, MemberRole } from "@prisma/client";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { buildLegalComplianceReport, type ComplianceStatus } from "@/features/legal/services/compliance.service";
import { exportToCSV, exportToXLSX, exportToPDF } from "@/features/reports/services/export";

const CONTENT_TYPES = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

export async function GET(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member || !hasPermission(member.systemRole, "legal.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const format = (params.get("format") ?? "csv") as keyof typeof CONTENT_TYPES;
  if (!(format in CONTENT_TYPES)) {
    return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  }

  const table = await buildLegalComplianceReport(member.organizationId, {
    role: params.get("role") && params.get("role") !== "all" ? (params.get("role") as MemberRole) : undefined,
    status:
      params.get("status") && params.get("status") !== "all" ? (params.get("status") as ComplianceStatus) : undefined,
    documentType:
      params.get("document") && params.get("document") !== "all"
        ? (params.get("document") as LegalDocumentType)
        : undefined,
    search: params.get("search") ?? undefined,
    from: params.get("from") ? new Date(params.get("from")!) : undefined,
    to: params.get("to") ? new Date(`${params.get("to")}T23:59:59`) : undefined,
  });

  let body: string | Buffer;
  if (format === "csv") body = exportToCSV(table);
  else if (format === "xlsx") body = exportToXLSX(table);
  else body = exportToPDF(table);

  await logAudit({
    organizationId: member.organizationId,
    actorId: member.id,
    action: "legal.document.acceptance_report_downloaded",
    entityType: "legal_compliance_report",
    entityId: member.organizationId,
    after: { format, rowCount: table.rows.length },
  });

  const filename = `legal-compliance-report-${new Date().toISOString().slice(0, 10)}.${format}`;

  return new NextResponse(new Uint8Array(Buffer.isBuffer(body) ? body : Buffer.from(body)), {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
