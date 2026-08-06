"use server";

import { revalidatePath } from "next/cache";
import type { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { EmailService } from "@/lib/email/email-service";
import { getApplicationDetail, listCommissionTiersForOrg } from "@/features/members/services/members.service";
import { getActivePlan } from "@/features/membership-plans/services/membership-plans.service";
import { requiresMembership } from "@/features/membership-plans/config/billing-config";
import { logMembershipLifecycleEvent } from "@/features/membership-plans/services/membership-lifecycle-log";

export type ApprovalActionResult = { success: true } | { success: false; error: string };

async function requireApprover() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.approve")) {
    throw new Error("You don't have permission to manage member applications.");
  }
  return actor;
}

/**
 * Grants the newly-approved member a trialing subscription to the org's
 * active membership plan — this is what actually delivers "first N months
 * free" as real state, not just marketing copy. No-ops if the member's
 * Role doesn't require a paid membership (see requiresMembership —
 * only CREATOR does), if they somehow already have a subscription
 * (re-approval, already backfilled), or the org has no active plan yet.
 */
async function ensureTrialingSubscription(organizationId: string, memberId: string, memberSince: Date, role: MemberRole) {
  if (!requiresMembership(role)) return;

  const existing = await prisma.memberSubscription.findUnique({ where: { memberId } });
  if (existing) return;

  const plan = await getActivePlan(organizationId, role);
  if (!plan) return;

  const trialEndsAt = plan.trialMonths > 0 ? addMonths(memberSince, plan.trialMonths) : null;
  await prisma.memberSubscription.create({
    data: {
      memberId,
      planId: plan.id,
      status: plan.trialMonths > 0 ? "TRIALING" : "ACTIVE",
      startedAt: memberSince,
      trialEndsAt,
      currentPeriodEnd: trialEndsAt,
    },
  });

  await logMembershipLifecycleEvent({ organizationId, memberId, type: "SUBSCRIBED", toPlanId: plan.id });
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Every mutation below re-checks members.approve server-side, independent of
 * whatever the client rendered — the client-side gating in the drawer is UX
 * only, this is the real authorization boundary.
 */
export async function fetchApplicationDetail(memberId: string) {
  const actor = await requireApprover();
  const [detail, commissionTiers] = await Promise.all([
    getApplicationDetail(actor.organizationId, memberId),
    listCommissionTiersForOrg(actor.organizationId),
  ]);
  if (!detail) throw new Error("Application not found.");
  return { ...detail, commissionTiers };
}

export async function approveMemberAction(memberId: string): Promise<ApprovalActionResult> {
  let actor;
  try {
    actor = await requireApprover();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!member) return { success: false, error: "Member not found." };
  if (member.status === "ACTIVE") return { success: false, error: "This member is already active." };

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: {
      status: "ACTIVE",
      approvedById: actor.id,
      approvedAt: new Date(),
      rejectedById: null,
      rejectedAt: null,
      rejectionReason: null,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "member.approved",
    entityType: "member",
    entityId: memberId,
    before: { status: member.status },
    after: { status: "ACTIVE" },
  });

  await ensureTrialingSubscription(actor.organizationId, updated.id, updated.memberSince, updated.role);

  await EmailService.sendMembershipApprovedEmail({
    to: updated.email,
    fullName: updated.fullName,
    organizationId: actor.organizationId,
    memberId: updated.id,
    sentBy: actor.id,
  });

  revalidatePath("/members/pending");
  revalidatePath("/members");
  revalidatePath("/admin");
  return { success: true };
}

export async function rejectMemberAction(memberId: string, reason: string): Promise<ApprovalActionResult> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { success: false, error: "A rejection reason is required." };
  }

  let actor;
  try {
    actor = await requireApprover();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!member) return { success: false, error: "Member not found." };

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: {
      status: "REJECTED",
      rejectedById: actor.id,
      rejectedAt: new Date(),
      rejectionReason: trimmedReason,
      approvedById: null,
      approvedAt: null,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "member.rejected",
    entityType: "member",
    entityId: memberId,
    before: { status: member.status },
    after: { status: "REJECTED", rejectionReason: trimmedReason },
  });

  const supportEmail = process.env.SUPPORT_EMAIL ?? "support@creatorhub360.com";
  await EmailService.sendMembershipDeniedEmail({
    to: updated.email,
    fullName: updated.fullName,
    reason: trimmedReason,
    supportEmail,
    organizationId: actor.organizationId,
    memberId: updated.id,
    sentBy: actor.id,
  });

  revalidatePath("/members/pending");
  revalidatePath("/members");
  revalidatePath("/admin");
  return { success: true };
}

export async function assignMemberTypeAction(memberId: string, role: MemberRole): Promise<ApprovalActionResult> {
  let actor;
  try {
    actor = await requireApprover();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!member) return { success: false, error: "Member not found." };

  await prisma.member.update({ where: { id: memberId }, data: { role } });

  revalidatePath("/members/pending");
  revalidatePath("/members");
  return { success: true };
}

export async function assignCommissionTierAction(
  memberId: string,
  commissionTierId: string | null
): Promise<ApprovalActionResult> {
  let actor;
  try {
    actor = await requireApprover();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!member) return { success: false, error: "Member not found." };

  if (commissionTierId) {
    const tier = await prisma.commissionTier.findFirst({
      where: { id: commissionTierId, organizationId: actor.organizationId },
    });
    if (!tier) return { success: false, error: "Commission tier not found." };
  }

  await prisma.member.update({ where: { id: memberId }, data: { commissionTierId } });

  revalidatePath("/members/pending");
  revalidatePath("/members");
  return { success: true };
}

export async function addInternalNoteAction(memberId: string, body: string): Promise<ApprovalActionResult> {
  const trimmedBody = body.trim();
  if (!trimmedBody) return { success: false, error: "Note can't be empty." };

  let actor;
  try {
    actor = await requireApprover();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!member) return { success: false, error: "Member not found." };

  await prisma.memberNote.create({ data: { memberId, authorId: actor.id, body: trimmedBody } });

  revalidatePath("/members/pending");
  return { success: true };
}
