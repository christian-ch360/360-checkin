import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { buildReport, REPORT_TYPES, type ReportType } from "@/features/reports/services/reports.service";
import { exportToCSV, exportToXLSX, exportToPDF } from "@/features/reports/services/export";

const CONTENT_TYPES = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const member = await getCurrentMember();
  if (!member || !hasPermission(member.systemRole, "reports.export")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await params;
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 404 });
  }

  const format = (request.nextUrl.searchParams.get("format") ?? "csv") as keyof typeof CONTENT_TYPES;
  if (!(format in CONTENT_TYPES)) {
    return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  }

  const table = await buildReport(member.organizationId, type as ReportType);

  let body: string | Buffer;
  if (format === "csv") body = exportToCSV(table);
  else if (format === "xlsx") body = exportToXLSX(table);
  else body = exportToPDF(table);

  const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.${format}`;

  return new NextResponse(new Uint8Array(Buffer.isBuffer(body) ? body : Buffer.from(body)), {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
