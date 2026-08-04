import "server-only";

import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/db/activity-log";
import { EmailService } from "@/lib/email/email-service";
import { checkGmvMilestones } from "@/features/agencies/services/agency-activity.service";
import type { RevenueChannel } from "@prisma/client";

export type RecordGMVParams = {
  organizationId: string;
  memberId: string;
  amount: number;
  channel?: RevenueChannel;
  projectId?: string | null;
  companyId?: string | null;
  brandId?: string | null;
  description?: string | null;
  source?: string | null;
  transactionDate?: Date;
  recordedByMemberId: string;
};

/**
 * Records a GMV transaction and, in the same DB transaction, calculates and
 * records the resulting commission using the member's assigned tier —
 * this is the single entry point the spec's "when GMV is entered, auto
 * calculate commission" requirement flows through.
 */
export async function recordGMVAndCommission(params: RecordGMVParams) {
  const member = await prisma.member.findFirst({
    where: { id: params.memberId, organizationId: params.organizationId },
    include: { commissionTier: true },
  });
  if (!member) throw new Error("Member not found");

  // The caller's organizationId is otherwise only used for the activity
  // log below — without these checks a caller could pass any project/
  // company/brand id and have it accepted, regardless of tenant.
  let projectName: string | null = null;
  if (params.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: params.projectId, organizationId: params.organizationId },
      select: { id: true, name: true },
    });
    if (!project) throw new Error("Project not found");
    projectName = project.name;
  }
  if (params.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: params.companyId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!company) throw new Error("Company not found");
  }
  if (params.brandId) {
    const brand = await prisma.brand.findFirst({
      where: { id: params.brandId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!brand) throw new Error("Brand not found");
  }

  const tier = member.commissionTier;
  const percentage = tier ? Number(tier.percentage) : 0;
  const commissionAmount = Math.round(params.amount * (percentage / 100) * 100) / 100;
  const remainingMargin = Math.round((params.amount - commissionAmount) * 100) / 100;
  // Project payout is the commission itself (drawn from the project's pool);
  // whatever margin remains after commission flows to the company.
  const projectPayout = commissionAmount;
  const companyPayout = remainingMargin;

  const result = await prisma.$transaction(async (tx) => {
    const gmvTransaction = await tx.gMVTransaction.create({
      data: {
        memberId: params.memberId,
        projectId: params.projectId || null,
        companyId: params.companyId || null,
        brandId: params.brandId || null,
        amount: params.amount,
        description: params.description || null,
        source: params.source || null,
        channel: params.channel ?? "OTHER",
        transactionDate: params.transactionDate ?? new Date(),
      },
    });

    const commissionTransaction = tier
      ? await tx.commissionTransaction.create({
          data: {
            memberId: params.memberId,
            projectId: params.projectId || null,
            gmvTransactionId: gmvTransaction.id,
            tierCode: tier.code,
            percentage: tier.percentage,
            gmvAmount: params.amount,
            commissionAmount,
            projectPayout,
            companyPayout,
            remainingMargin,
            status: "PENDING",
          },
        })
      : null;

    await tx.member.update({
      where: { id: params.memberId },
      data: {
        currentGMV: { increment: params.amount },
        lifetimeGMV: { increment: params.amount },
        ...(commissionTransaction
          ? {
              currentCommission: { increment: commissionAmount },
              lifetimeCommission: { increment: commissionAmount },
            }
          : {}),
      },
    });

    if (params.projectId) {
      await tx.project.update({
        where: { id: params.projectId },
        data: {
          gmv: { increment: params.amount },
          ...(commissionTransaction ? { commissionPool: { increment: commissionAmount } } : {}),
        },
      });
    }

    return { gmvTransaction, commissionTransaction };
  });

  await logActivity({
    organizationId: params.organizationId,
    memberId: params.recordedByMemberId,
    action: "gmv.entered",
    entityType: "gmv_transaction",
    entityId: result.gmvTransaction.id,
    metadata: { memberId: params.memberId, amount: params.amount },
  });

  // "Creator generated first GMV" / "Agency reached $X" milestones —
  // best-effort, never allowed to affect the GMV recording that just
  // succeeded above (see checkGmvMilestones's own try/catch).
  await checkGmvMilestones(params.organizationId, params.memberId);

  if (result.commissionTransaction) {
    await logActivity({
      organizationId: params.organizationId,
      memberId: params.memberId,
      action: "commission.generated",
      entityType: "commission_transaction",
      entityId: result.commissionTransaction.id,
      metadata: { commissionAmount },
    });

    if (member.notifyEmail) {
      await EmailService.sendCommissionNotificationEmail({
        to: member.email,
        fullName: member.fullName,
        amount: commissionAmount,
        projectName,
        status: "pending",
        organizationId: params.organizationId,
        memberId: member.id,
      });
    }
  }

  return result;
}
