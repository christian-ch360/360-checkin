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
}: {
  type: ReportType;
  label: string;
  format?: "csv" | "xlsx" | "pdf";
}) {
  return (
    <Button variant="outline" asChild>
      <a href={`/api/reports/${type}?format=${format}`} download>
        <FileDown /> {label}
      </a>
    </Button>
  );
}
