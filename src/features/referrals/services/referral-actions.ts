"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import {
  validateReferralCode,
  transferReferral,
  requestOrConnectAgency,
  approveCreatorRequest,
  rejectCreatorRequest,
  type RequestAgencyResult,
} from "@/features/referrals/services/referral.service";

export type ValidateReferralCodeResult =
  | { valid: true; referrerName: string }
  | { valid: false; reason: string };

/**
 * Public, unauthenticated — same trust model as submitApplicationAction.
 * Powers the apply form's live "✓ Connected to: <Agency Name>" preview.
 * Resolves the org the same "single default org" way every other public
 * page does; never exposes anything about the referrer beyond their name.
 */
export async function validateReferralCodeAction(code: string): Promise<ValidateReferralCodeResult> {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!organization) return { valid: false, reason: "We couldn't find an agency with that ID." };

  const result = await validateReferralCode(organization.id, code);
  if (!result.valid) return result;
  return { valid: true, referrerName: result.referrerName };
}

export type TransferReferralActionResult = { success: true } | { success: false; error: string };

/**
 * "Creators cannot change their Agency ID after approval unless a Super
 * Admin authorizes the transfer" — this is that authorization. Gated by
 * referrals.transfer, which (like roles.manage/legal.publish/billing.override)
 * only SUPER_ADMIN holds, via the ALL_PERMISSIONS spread in lib/permissions.
 */
export async function transferReferralAction(
  memberId: string,
  newReferralCode: string | null,
  reason: string
): Promise<TransferReferralActionResult> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { success: false, error: "A reason is required to transfer a referral assignment." };

  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "referrals.transfer")) {
    return { success: false, error: "Only Super Admins can transfer a member's agency assignment." };
  }

  const before = await prisma.member.findFirst({
    where: { id: memberId, organizationId: actor.organizationId },
    select: { referredByMemberId: true, referredByCode: true },
  });
  if (!before) return { success: false, error: "Member not found." };

  const result = await transferReferral({
    organizationId: actor.organizationId,
    memberId,
    newReferralCode: newReferralCode?.trim() || null,
  });
  if (!result.success) return result;

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "referral.transferred",
    entityType: "member",
    entityId: memberId,
    before: { referredByMemberId: before.referredByMemberId, referredByCode: before.referredByCode },
    after: { referredByMemberId: result.newReferrerId, referredByCode: newReferralCode?.trim().toUpperCase() ?? null, reason: trimmedReason },
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/agency");
  return { success: true };
}

/**
 * Self-service manual Agency ID entry — the Signup and Profile Settings
 * surfaces (Apply goes through submitApplication/connectReferralOnApproval
 * instead, since no Member exists yet at that point). Always MANUAL_ENTRY:
 * "creators cannot manually connect themselves without agency approval" —
 * requestOrConnectAgency creates a PENDING request rather than connecting,
 * and notifies the agency.
 */
export async function requestAgencyConnectionAction(code: string): Promise<RequestAgencyResult> {
  const actor = await requireCurrentMember();
  const trimmed = code.trim();
  if (!trimmed) return { success: false, error: "Enter an Agency ID." };

  const result = await requestOrConnectAgency(actor.organizationId, actor.id, trimmed, "MANUAL_ENTRY");

  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "referral.request_submitted",
      entityType: "member",
      entityId: actor.id,
      after: { referralCode: trimmed.toUpperCase(), status: result.status },
    });
  }

  revalidatePath("/settings");
  return result;
}

export type CreatorRequestReviewResult = { success: true } | { success: false; error: string };

async function requireAgencyReviewer(referralLinkId: string) {
  const actor = await requireCurrentMember();
  const link = await prisma.referralLink.findFirst({
    where: { id: referralLinkId, organizationId: actor.organizationId },
    select: { referrerMemberId: true },
  });
  if (!link) return { actor, allowed: false as const, error: "Request not found." };

  // "Only the agency receiving the request may approve or reject it. Only
  // Super Admins may override or manually assign an agency."
  const isReceivingAgency = actor.id === link.referrerMemberId;
  const isSuperAdminOverride = hasPermission(actor.systemRole, "referrals.transfer");
  if (!isReceivingAgency && !isSuperAdminOverride) {
    return { actor, allowed: false as const, error: "Only the receiving agency (or a Super Admin) can review this request." };
  }
  return { actor, allowed: true as const, referrerMemberId: link.referrerMemberId };
}

export async function approveCreatorRequestAction(referralLinkId: string): Promise<CreatorRequestReviewResult> {
  const check = await requireAgencyReviewer(referralLinkId);
  if (!check.allowed) return { success: false, error: check.error };

  const result = await approveCreatorRequest(check.actor.organizationId, referralLinkId, check.referrerMemberId);
  if (!result.success) return result;

  await logAudit({
    organizationId: check.actor.organizationId,
    actorId: check.actor.id,
    action: "referral.request_approved",
    entityType: "member",
    entityId: result.creatorId,
    after: { agencyName: result.agencyName },
  });

  revalidatePath("/agency");
  revalidatePath(`/members/${result.creatorId}`);
  return { success: true };
}

export async function rejectCreatorRequestAction(referralLinkId: string, note?: string): Promise<CreatorRequestReviewResult> {
  const check = await requireAgencyReviewer(referralLinkId);
  if (!check.allowed) return { success: false, error: check.error };

  const result = await rejectCreatorRequest(check.actor.organizationId, referralLinkId, check.referrerMemberId, note);
  if (!result.success) return result;

  await logAudit({
    organizationId: check.actor.organizationId,
    actorId: check.actor.id,
    action: "referral.request_rejected",
    entityType: "member",
    entityId: result.creatorId,
    after: { agencyName: result.agencyName, note: note?.trim() || null },
  });

  revalidatePath("/agency");
  return { success: true };
}
