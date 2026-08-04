import { FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReportType } from "@/features/reports/services/reports.service";

export function ReportCard({
  type,
  title,
  description,
  rowCount,
}: {
  type: ReportType;
  title: string;
  description: string;
  rowCount: number;
}) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{rowCount} row{rowCount === 1 ? "" : "s"}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/reports/${type}?format=csv`} download>
              <FileDown /> CSV
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/reports/${type}?format=xlsx`} download>
              <FileSpreadsheet /> Excel
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/reports/${type}?format=pdf`} download>
              <FileText /> PDF
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
