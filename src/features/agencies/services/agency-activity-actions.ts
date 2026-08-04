"use server";

import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getAgencyActivity, type AgencyActivityFilter } from "@/features/agencies/services/agency-activity.service";

function effectiveAgencyIdFor(actor: { id: string; agencyId: string | null }): string {
  return actor.agencyId ?? actor.id;
}

/** Backs the Team Activity Feed's Today/This Week/This Month/All Time filter tabs. */
export async function getAgencyActivityAction(filter: AgencyActivityFilter) {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  return getAgencyActivity(actor.organizationId, agencyId, filter);
}
