import "server-only";

import { findDuplicateEmailGroups, type DuplicateApplicationGroup } from "@/features/admin/services/duplicate-emails.service";

export type DuplicateGroupCaseType = "approved_pending" | "multiple_pending" | "different_names";

export type ResolvableDuplicateGroup = DuplicateApplicationGroup & {
  caseType: DuplicateGroupCaseType;
  /** Only set for "approved_pending" — the application the one-click recommendation would keep. The admin still has to click it; nothing here is applied automatically. */
  recommendedKeepApplicationId: string | null;
};

function firstNameToken(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

/** A cheap, deliberately conservative "is this obviously the same person" check — comparing first names only. It only ever widens which groups get flagged for manual review (different_names), never narrows it — see classifyGroup. */
function likelySamePerson(applications: { fullName: string }[]): boolean {
  const tokens = new Set(applications.map((a) => firstNameToken(a.fullName)));
  return tokens.size <= 1;
}

/**
 * Classifies one duplicate-email group per the three resolution cases:
 *
 * - approved_pending (CASE A): exactly one APPROVED application among the
 *   still-unresolved ones, and every applicant's first name matches — e.g.
 *   "Katrell Platt" (Approved) + "Katrell Platt" (Pending). Gets a one-click
 *   recommended action, but the action still has to be explicitly clicked —
 *   nothing here resolves anything by itself.
 * - different_names (CASE C): the applicants' first names don't match at
 *   all (e.g. "Abdul rana" vs "Rashel herrera" sharing an email) — flagged
 *   for manual review with no recommendation, even if one happens to be
 *   APPROVED, since an approved+pending pair under different names is
 *   exactly the "don't auto-reject" scenario the spec calls out.
 * - multiple_pending (CASE B): everything else — no single application is
 *   the obvious keeper, an admin has to pick one.
 */
function classifyGroup(applications: DuplicateApplicationGroup["applications"]): {
  caseType: DuplicateGroupCaseType;
  recommendedKeepApplicationId: string | null;
} {
  const approved = applications.filter((a) => a.status === "APPROVED");
  const sameFirstName = likelySamePerson(applications);

  if (!sameFirstName) return { caseType: "different_names", recommendedKeepApplicationId: null };
  if (approved.length === 1) return { caseType: "approved_pending", recommendedKeepApplicationId: approved[0].id };
  return { caseType: "multiple_pending", recommendedKeepApplicationId: null };
}

/**
 * The duplicate-email groups that still need an admin decision — reuses
 * findDuplicateEmailGroups' exact "what counts as a duplicate group"
 * definition (same normalized email, 2+ applications) and layers a
 * resolved/unresolved distinction on top: a group is resolved once exactly
 * one of its applications is left in a non-DUPLICATE status (that one is
 * the kept/canonical application; everything else has been explicitly
 * marked DUPLICATE by an admin). Resolved groups are simply omitted — they
 * no longer need attention, and both applications remain fully intact and
 * reviewable from the applications list either way.
 */
export async function listUnresolvedDuplicateGroups(organizationId: string): Promise<ResolvableDuplicateGroup[]> {
  const { applicationDuplicateGroups } = await findDuplicateEmailGroups(organizationId);

  const unresolved: ResolvableDuplicateGroup[] = [];
  for (const group of applicationDuplicateGroups) {
    const active = group.applications.filter((a) => a.status !== "DUPLICATE");
    if (active.length <= 1) continue;

    const { caseType, recommendedKeepApplicationId } = classifyGroup(active);
    unresolved.push({ email: group.email, applications: active, caseType, recommendedKeepApplicationId });
  }
  return unresolved;
}
