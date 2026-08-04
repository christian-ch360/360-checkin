import type { ComplianceStatus } from "@/features/legal/services/compliance.service";
import type { statusToneClass } from "@/lib/utils/status-colors";

export const COMPLIANCE_STATUS_META: Record<ComplianceStatus, { label: string; tone: keyof typeof statusToneClass }> = {
  COMPLIANT: { label: "Compliant", tone: "success" },
  NEEDS_REACCEPTANCE: { label: "Needs Re-Acceptance", tone: "warning" },
  PENDING: { label: "Pending", tone: "info" },
  NEVER_ACCEPTED: { label: "Never Accepted", tone: "error" },
};
