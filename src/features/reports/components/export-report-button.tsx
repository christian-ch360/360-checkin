import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportType } from "@/features/reports/services/reports.service";

/**
 * Contextual "Export X" button for a page whose data maps to one of the
 * Reports module's report types — hits the same /api/reports/[type] route
 * report-card.tsx uses, so there is exactly one export implementation.
 */
export function ExportReportButton({
  type,
  label,
  format = "xlsx",
  queryParams,
}: {
  type: ReportType;
  label: string;
  format?: "csv" | "xlsx" | "pdf";
  /** Extra filters (e.g. the Applications page's current status/search/role) forwarded as-is to /api/reports/[type]. */
  queryParams?: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams({ format });
  for (const [key, value] of Object.entries(queryParams ?? {})) {
    if (value) params.set(key, value);
  }

  return (
    <Button variant="outline" asChild>
      <a href={`/api/reports/${type}?${params.toString()}`} download>
        <FileDown /> {label}
      </a>
    </Button>
  );
}
