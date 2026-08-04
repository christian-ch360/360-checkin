"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { prisma } from "@/lib/db/prisma";
import { revenueGoalSchema, type RevenueGoalInput } from "@/features/revenue/schemas/revenue.schema";

export type RevenueActionResult = { success: true } | { success: false; error: string };

export async function updateRevenueGoal(input: RevenueGoalInput): Promise<RevenueActionResult> {
  const actor = await requireCurrentMember();

  const parsed = revenueGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const amount = Number(parsed.data.annualGoal);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Enter a valid positive amount" };
  }

  const annualGoalCents = Math.round(amount * 100);
  await prisma.revenueGoal.upsert({
    where: { memberId: actor.id },
    create: { memberId: actor.id, annualGoalCents },
    update: { annualGoalCents },
  });

  revalidatePath("/profile");
  return { success: true };
}
