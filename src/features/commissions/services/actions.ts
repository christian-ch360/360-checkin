"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { EmailService } from "@/lib/email/email-service";

export type CommissionActionResult = { success: true } | { success: false; error: string };

const tierUpdateSchema = z.object({
  tierId: z.string().uuid(),
  percentage: z.string().min(1),
});

export async function updateCommissionTierPercentage(input: z.infer<typeof tierUpdateSchema>): Promise<CommissionActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "commissions.manage")) {
    return { success: false, error: "You don't have permission to manage commission tiers." };
  }

  const parsed = tierUpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const percentage = Number(parsed.data.percentage);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return { success: false, error: "Enter a percentage between 0 and 100" };
  }

  await prisma.commissionTier.update({
    where: { id: parsed.data.tierId, organizationId: actor.organizationId },
    data: { percentage },
  });

  revalidatePath("/commissions");
  return { success: true };
}

export async function approveCommission(commissionId: string): Promise<CommissionActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "commissions.manage")) {
    return { success: false, error: "You don't have permission to approve commissions." };
  }

  const commission = await prisma.commissionTransaction.findFirst({
    where: { id: commissionId, member: { organizationId: actor.organizationId } },
    select: { id: true },
  });
  if (!commission) return { success: false, error: "Commission not found" };

  await prisma.commissionTransaction.update({
    where: { id: commission.id },
    data: { status: "APPROVED" },
  });

  revalidatePath("/commissions");
  return { success: true };
}

export async function markCommissionPaid(commissionId: string): Promise<CommissionActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "commissions.manage")) {
    return { success: false, error: "You don't have permission to mark commissions paid." };
  }

  const commission = await prisma.commissionTransaction.findFirst({
    where: { id: commissionId, member: { organizationId: actor.organizationId } },
    include: { member: true, project: { select: { name: true } } },
  });
  if (!commission) return { success: false, error: "Commission not found" };

  await prisma.$transaction([
    prisma.commissionTransaction.update({
      where: { id: commission.id },
      data: { status: "PAID" },
    }),
    prisma.payout.create({
      data: {
        memberId: commission.memberId,
        commissionTransactionId: commission.id,
        amount: commission.commissionAmount,
        status: "PAID",
        paidAt: new Date(),
      },
    }),
  ]);

  if (commission.member.notifyEmail) {
    await EmailService.sendCommissionNotificationEmail({
      to: commission.member.email,
      fullName: commission.member.fullName,
      amount: Number(commission.commissionAmount),
      projectName: commission.project?.name ?? null,
      status: "paid",
      organizationId: actor.organizationId,
      memberId: commission.memberId,
    });
  }

  revalidatePath("/commissions");
  return { success: true };
}
