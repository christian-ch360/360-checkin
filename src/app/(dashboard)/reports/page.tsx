import { requireCurrentMember } from "@/features/auth/services/current-member";
import {
  getCachedReportSummary,
  REPORT_TYPES,
  type ReportType,
} from "@/features/reports/services/reports.service";
import { hasPermission } from "@/lib/permissions";
import { ReportCard } from "@/features/reports/components/report-card";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reports" };

const REPORT_META: Record<ReportType, { title: string; description: string }> = {
  members: { title: "Members", description: "Member roster with hours worked and commission owed." },
  commission: { title: "Commissions", description: "Every commission transaction with tier and status." },
  attendance: { title: "Attendance", description: "Full check-in and check-out history." },
  hours: { title: "Hours Worked", description: "Total hours logged per member." },
  gmv: { title: "GMV", description: "Every GMV transaction with attribution." },
  projects: { title: "Projects", description: "Budget, GMV, and commission pool per project." },
};

export default async function ReportsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "reports.view")) {
    redirect("/dashboard");
  }

  const rowCounts = await getCachedReportSummary(actor.organizationId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Reports</h1>
        <p className="text-sm text-muted-foreground">Export operational data as CSV, Excel, or PDF.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORT_TYPES.map((type) => (
          <ReportCard
            key={type}
            type={type}
            title={REPORT_META[type].title}
            description={REPORT_META[type].description}
            rowCount={rowCounts[type]}
          />
        ))}
      </div>
    </div>
  );
}
