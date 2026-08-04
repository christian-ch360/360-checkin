import { FileText, Users, ShieldCheck, ShieldAlert, Clock, FileWarning, History } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import type { LegalDashboardKpis } from "@/features/legal/services/compliance.service";

export function LegalKpiGrid({ kpis }: { kpis: LegalDashboardKpis }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Legal Document Versions"
        value={kpis.documentVersions.map((d) => `v${d.version}`).join(" / ")}
        icon={FileText}
        caption={kpis.documentVersions.map((d) => d.title).join(", ")}
      />
      <StatCard label="Total Members" value={String(kpis.totalMembers)} icon={Users} />
      <StatCard
        label="Members Fully Compliant"
        value={String(kpis.fullyCompliant)}
        icon={ShieldCheck}
        accent="success"
      />
      <StatCard
        label="Members Requiring Re-Acceptance"
        value={String(kpis.needsReacceptance)}
        icon={ShieldAlert}
        accent={kpis.needsReacceptance > 0 ? "warning" : "default"}
      />
      <StatCard
        label="Pending Applications"
        value={String(kpis.pendingApplications)}
        icon={Clock}
        accent={kpis.pendingApplications > 0 ? "warning" : "default"}
      />
      <StatCard
        label="Applications Missing Consents"
        value={String(kpis.applicationsMissingConsents)}
        icon={FileWarning}
        accent={kpis.applicationsMissingConsents > 0 ? "danger" : "default"}
      />
      <StatCard label="Documents Updated This Year" value={String(kpis.documentsUpdatedThisYear)} icon={History} />
    </div>
  );
}
