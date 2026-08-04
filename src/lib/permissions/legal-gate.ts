import "server-only";

import { getOutstandingAcceptanceTypes } from "@/features/legal/services/legal.service";

/**
 * Whether this member has any outstanding legal document acceptances (a
 * major version they haven't re-accepted, or never accepted at all). Used
 * to gate the two protected member actions the Admin Legal spec calls out
 * (createCollabPost, bookSpace) — same shape as membership-gate.ts's
 * requireActiveMembership so callers handle it identically.
 */
export async function requireLegalCompliance(
  organizationId: string,
  memberId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const outstanding = await getOutstandingAcceptanceTypes(organizationId, memberId);
  if (outstanding.length === 0) return { allowed: true };
  return {
    allowed: false,
    reason: "You need to review and accept updated legal documents before continuing. Visit /legal/reaccept.",
  };
}
