"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { setCampaignRequestInternalStatus } from "@/features/creator-library/services/campaign-request.service";
import type { CampaignRequestReviewStatus } from "@prisma/client";

/**
 * Internal-only actions for reviewing campaign requests — gated by
 * `requireCurrentMember()` + the same `"members.manage"` permission the rest
 * of the Creator Library admin uses. Never imported by anything under
 * src/app/creator-library/** (the public surface).
 */
async function requireLibraryManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    throw new Error("You don't have permission to manage campaign requests.");
  }
  return actor;
}

export type UpdateCampaignRequestStatusResult = { success: true } | { success: false; error: string };

export async function updateCampaignRequestStatus(
  id: string,
  status: CampaignRequestReviewStatus,
): Promise<UpdateCampaignRequestStatusResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }

  const updated = await setCampaignRequestInternalStatus(actor.organizationId, id, status);
  if (!updated) return { success: false, error: "That campaign request could not be found." };

  revalidatePath("/admin/creator-library/campaign-requests");
  return { success: true };
}
