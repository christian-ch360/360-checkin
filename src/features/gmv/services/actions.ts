"use server";

import { revalidatePath } from "next/cache";
import { gmvEntrySchema, type GMVEntryInput } from "@/features/gmv/schemas/gmv.schema";
import { recordGMVAndCommission } from "@/features/commissions/services/commission-engine";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";

export type GMVActionResult = { success: true } | { success: false; error: string };

export async function recordGMV(input: GMVEntryInput): Promise<GMVActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "gmv.manage")) {
    return { success: false, error: "You don't have permission to record GMV." };
  }

  const parsed = gmvEntrySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Enter a valid positive amount" };
  }

  await recordGMVAndCommission({
    organizationId: actor.organizationId,
    memberId: data.memberId,
    amount,
    channel: data.channel,
    projectId: data.projectId || null,
    companyId: data.companyId || null,
    brandId: data.brandId || null,
    description: data.description || null,
    transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
    recordedByMemberId: actor.id,
  });

  revalidatePath("/gmv");
  revalidatePath("/commissions");
  revalidatePath("/dashboard");
  revalidatePath("/members");
  revalidatePath("/profile");
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);

  return { success: true };
}
