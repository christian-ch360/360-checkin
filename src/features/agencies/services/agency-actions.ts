"use server";

import { revalidatePath } from "next/cache";
import type { AgencyMemberRole } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { instagramUrl, tiktokUrl, youtubeUrl, linkedinUrl } from "@/lib/utils/social-links";
import { agencyProfileSchema, type AgencyProfileInput } from "@/features/agencies/schemas/agency-profile.schema";
import { mergeAgencies } from "@/features/agencies/services/agency-duplicate.service";
import {
  approveAgencyAccessRequest,
  rejectAgencyAccessRequest,
  overrideAgencyAccess,
  isAgencyAdmin,
  isAgencyOwner,
} from "@/features/agencies/services/agency-access.service";
import {
  removeTeamMember,
  leaveAgency,
  updateTeamMemberRole,
  transferOwnership,
} from "@/features/agencies/services/agency-team.service";
import { canManageTeamMember, canTransferOwnership, canInviteRole } from "@/features/agencies/config/agency-permissions";
import {
  createAgencyInvitation,
  resendAgencyInvitation,
  revokeAgencyInvitation,
  acceptAgencyInvitation,
  declineAgencyInvitation,
} from "@/features/agencies/services/agency-invitations.service";
import { logAgencyActivity } from "@/features/agencies/services/agency-activity.service";

export type MergeAgenciesActionResult = { success: true } | { success: false; error: string };

/**
 * "Only Super Admins may merge duplicate agencies if one is accidentally
 * created." Called from the *duplicate's* profile page — `duplicateAgencyId`
 * is whichever agency the Super Admin is currently viewing, and
 * `primaryReferralCode` is the real agency's Agency ID they're merging into.
 * All the actual reassignment/audit logging lives in mergeAgencies.
 */
export async function mergeAgenciesAction(
  duplicateAgencyId: string,
  primaryReferralCode: string
): Promise<MergeAgenciesActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "agencies.merge")) {
    return { success: false, error: "Only Super Admins can merge agencies." };
  }

  const code = primaryReferralCode.trim().toUpperCase();
  if (!code) return { success: false, error: "Enter the Agency ID to merge into." };

  const primary = await prisma.member.findFirst({
    where: { organizationId: actor.organizationId, referralCode: code, deletedAt: null },
    select: { id: true },
  });
  if (!primary) return { success: false, error: "We couldn't find an agency with that ID." };

  const result = await mergeAgencies(actor.organizationId, primary.id, duplicateAgencyId, actor.id);
  if (!result.success) return result;

  revalidatePath(`/members/${duplicateAgencyId}`);
  revalidatePath(`/members/${primary.id}`);
  revalidatePath("/agency");
  return { success: true };
}

export type AgencyAccessActionResult = { success: true } | { success: false; error: string };

async function requireAgencyAccessAdmin(requestId: string) {
  const actor = await requireCurrentMember();
  const request = await prisma.agencyAccessRequest.findFirst({
    where: { id: requestId, organizationId: actor.organizationId },
    select: { agencyId: true },
  });
  if (!request) return { actor, allowed: false as const, error: "Request not found." };

  // "Only the agency receiving the request may approve or reject it" (mirrors
  // the creator-agency workflow), plus the Super Admin override permission.
  const isSuperAdminOverride = hasPermission(actor.systemRole, "agencies.access_override");
  if (!isAgencyAdmin(actor, request.agencyId) && !isSuperAdminOverride) {
    return { actor, allowed: false as const, error: "Only the agency's own admins (or a Super Admin) can review this request." };
  }
  return { actor, allowed: true as const, agencyId: request.agencyId };
}

export async function approveAgencyAccessRequestAction(requestId: string): Promise<AgencyAccessActionResult> {
  const check = await requireAgencyAccessAdmin(requestId);
  if (!check.allowed) return { success: false, error: check.error };

  const result = await approveAgencyAccessRequest(check.actor.organizationId, requestId, check.agencyId, check.actor.id);
  if (!result.success) return result;

  await logAudit({
    organizationId: check.actor.organizationId,
    actorId: check.actor.id,
    action: "agency.access_approved",
    entityType: "member",
    entityId: result.requesterId,
    after: { agencyId: check.agencyId, agencyName: result.agencyName },
  });

  revalidatePath("/agency");
  revalidatePath("/agency/team");
  revalidatePath(`/members/${result.requesterId}`);
  return { success: true };
}

export async function rejectAgencyAccessRequestAction(requestId: string, note?: string): Promise<AgencyAccessActionResult> {
  const check = await requireAgencyAccessAdmin(requestId);
  if (!check.allowed) return { success: false, error: check.error };

  const result = await rejectAgencyAccessRequest(check.actor.organizationId, requestId, check.agencyId, note, check.actor.id);
  if (!result.success) return result;

  await logAudit({
    organizationId: check.actor.organizationId,
    actorId: check.actor.id,
    action: "agency.access_rejected",
    entityType: "member",
    entityId: result.requesterId,
    after: { agencyId: check.agencyId, agencyName: result.agencyName, note: note?.trim() || null },
  });

  revalidatePath("/agency");
  revalidatePath("/agency/team");
  return { success: true };
}

/**
 * "Only Super Admins may override this process" — grants access directly,
 * bypassing any pending request. Used e.g. when an admin needs to manually
 * fix a mis-filed application without waiting on the agency's own review.
 */
export async function overrideAgencyAccessAction(
  requesterId: string,
  agencyReferralCode: string,
  role: AgencyMemberRole
): Promise<AgencyAccessActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "agencies.access_override")) {
    return { success: false, error: "Only Super Admins can override agency access." };
  }

  const code = agencyReferralCode.trim().toUpperCase();
  const agency = await prisma.member.findFirst({
    where: { organizationId: actor.organizationId, referralCode: code, deletedAt: null },
    select: { id: true },
  });
  if (!agency) return { success: false, error: "We couldn't find an agency with that ID." };

  const result = await overrideAgencyAccess(actor.organizationId, requesterId, agency.id, role, actor.id);
  if (!result.success) return result;

  revalidatePath("/agency");
  revalidatePath(`/members/${requesterId}`);
  return { success: true };
}

/** Thin UI adapter over overrideAgencyAccessAction — resolves the requester by email so the
 * admin form doesn't need a member-ID picker, then delegates to the same override logic
 * (no duplicated authorization or write logic). */
export async function overrideAgencyAccessByEmailAction(
  requesterEmail: string,
  agencyReferralCode: string,
  role: AgencyMemberRole
): Promise<AgencyAccessActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "agencies.access_override")) {
    return { success: false, error: "Only Super Admins can override agency access." };
  }

  const requester = await prisma.member.findFirst({
    where: { organizationId: actor.organizationId, email: requesterEmail.trim().toLowerCase(), deletedAt: null },
    select: { id: true },
  });
  if (!requester) return { success: false, error: "We couldn't find a member with that email." };

  return overrideAgencyAccessAction(requester.id, agencyReferralCode, role);
}

export type AgencyTeamManagementResult = { success: true } | { success: false; error: string };

function effectiveAgencyIdFor(actor: { id: string; agencyId: string | null }): string {
  return actor.agencyId ?? actor.id;
}

/** "Manager ... Cannot: Remove Owner" — resolves both the acting admin's authority and the
 * target's current role so canManageTeamMember can veto Manager-vs-Owner actions server-side,
 * not just hide the button client-side. */
async function requireTeamManagementAuthority(targetMemberId: string) {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);

  if (!isAgencyAdmin(actor, agencyId)) {
    return { actor, agencyId, allowed: false as const, error: "Only an Owner or Manager can manage the team." };
  }

  const target = await prisma.member.findFirst({
    where: { id: targetMemberId, organizationId: actor.organizationId, OR: [{ id: agencyId }, { agencyId }] },
    select: { agencyRole: true },
  });
  if (!target) return { actor, agencyId, allowed: false as const, error: "Team member not found." };

  const targetRole = target.agencyRole ?? "OWNER"; // canonical member with unbackfilled role
  if (!canManageTeamMember(actor.agencyRole, targetRole)) {
    return { actor, agencyId, allowed: false as const, error: "Managers cannot manage an Owner." };
  }
  return { actor, agencyId, allowed: true as const };
}

export async function removeTeamMemberAction(memberId: string): Promise<AgencyTeamManagementResult> {
  const check = await requireTeamManagementAuthority(memberId);
  if (!check.allowed) return { success: false, error: check.error };

  const result = await removeTeamMember(check.actor.organizationId, check.agencyId, memberId, check.actor.id);
  if (!result.success) return result;

  revalidatePath("/agency/team");
  revalidatePath("/agency");
  return { success: true };
}

export async function updateTeamMemberRoleAction(memberId: string, newRole: AgencyMemberRole): Promise<AgencyTeamManagementResult> {
  const check = await requireTeamManagementAuthority(memberId);
  if (!check.allowed) return { success: false, error: check.error };

  // Promoting someone TO Owner is itself Owner-only — a Manager could
  // otherwise demote-then-promote their way around "Managers cannot invite
  // Owners" by using role changes instead of invitations.
  if (newRole === "OWNER" && !isAgencyOwner(check.actor, check.agencyId)) {
    return { success: false, error: "Only an Owner can promote someone to Owner." };
  }

  const result = await updateTeamMemberRole(check.actor.organizationId, check.agencyId, memberId, newRole, check.actor.id);
  if (!result.success) return result;

  revalidatePath("/agency/team");
  return { success: true };
}

/** "Only after another Owner exists may the original Owner leave." Self-service — the acting
 * member removes themselves; the last-owner guard lives inside leaveAgency itself. */
export async function leaveAgencyAction(): Promise<AgencyTeamManagementResult> {
  const actor = await requireCurrentMember();
  const result = await leaveAgency(actor.organizationId, actor.id);
  if (!result.success) return result;

  revalidatePath("/agency");
  revalidatePath("/agency/team");
  return { success: true };
}

/**
 * "Create a dedicated Transfer Ownership workflow. Owner selects another
 * active Owner or Manager." Owner-only — canTransferOwnership already
 * excludes Manager/Staff, but the check is repeated here (not just relied on
 * client-side) since this is the server boundary.
 */
export async function transferOwnershipAction(toMemberId: string): Promise<AgencyTeamManagementResult> {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);

  if (!canTransferOwnership(actor.agencyRole)) {
    return { success: false, error: "Only the current Owner can transfer ownership." };
  }

  const result = await transferOwnership(actor.organizationId, agencyId, actor.id, toMemberId);
  if (!result.success) return result;

  revalidatePath("/agency/team");
  revalidatePath("/agency");
  return { success: true };
}

export type AgencyProfileActionResult = { success: true } | { success: false; error: string };

/**
 * "Agency Settings" — Owner/Manager only (same authority as inviting or
 * approving creator requests). Edits the *canonical* agency Member row, not
 * necessarily the actor's own — a team member editing their agency's profile
 * is exactly the case `effectiveAgencyIdFor` exists for.
 */
export async function updateAgencyProfileAction(input: AgencyProfileInput): Promise<AgencyProfileActionResult> {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);

  if (!isAgencyAdmin(actor, agencyId)) {
    return { success: false, error: "Only an Owner or Manager can edit the agency profile." };
  }

  const parsed = agencyProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const before = await prisma.member.findFirst({
    where: { id: agencyId, organizationId: actor.organizationId },
    select: {
      fullName: true,
      website: true,
      bio: true,
      location: true,
      businessRegistrationNumber: true,
      agencyCategories: true,
    },
  });
  if (!before) return { success: false, error: "Agency not found." };

  await prisma.member.update({
    where: { id: agencyId },
    data: {
      fullName: data.fullName,
      website: data.website || null,
      bio: data.bio || null,
      location: data.location || null,
      businessRegistrationNumber: data.businessRegistrationNumber || null,
      agencyCategories: data.agencyCategories,
      instagramUrl: instagramUrl(data.instagramUrl),
      tiktokUrl: tiktokUrl(data.tiktokUrl),
      youtubeUrl: youtubeUrl(data.youtubeUrl),
      linkedinUrl: linkedinUrl(data.linkedinUrl),
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "agency.profile_updated",
    entityType: "member",
    entityId: agencyId,
    before,
    after: {
      fullName: data.fullName,
      website: data.website || null,
      bio: data.bio || null,
      location: data.location || null,
      businessRegistrationNumber: data.businessRegistrationNumber || null,
      agencyCategories: data.agencyCategories,
    },
  });
  await logAgencyActivity({
    organizationId: actor.organizationId,
    agencyId,
    type: "PROFILE_UPDATED",
    actorId: actor.id,
    message: `${actor.fullName} updated the agency profile`,
  });

  revalidatePath("/agency/settings");
  revalidatePath("/agency");
  return { success: true };
}

export type AgencyInvitationFormResult = { success: true } | { success: false; error: string };

/**
 * "Owner: Invite anyone. Manager: Invite Staff and Managers, cannot invite
 * Owners. Staff: cannot invite anyone." canInviteRole is the single source
 * of truth both this action and the UI form use.
 */
export async function inviteAgencyTeamMemberAction(fullName: string, email: string, role: AgencyMemberRole): Promise<AgencyInvitationFormResult> {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);

  if (!isAgencyAdmin(actor, agencyId)) {
    return { success: false, error: "Only an Owner or Manager can invite team members." };
  }
  if (!canInviteRole(actor.agencyRole, role)) {
    return { success: false, error: "Managers cannot invite Owners." };
  }

  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();
  if (!trimmedName) return { success: false, error: "Enter a full name." };
  if (!trimmedEmail || !trimmedEmail.includes("@")) return { success: false, error: "Enter a valid email address." };

  const result = await createAgencyInvitation(actor.organizationId, agencyId, trimmedName, trimmedEmail, role, actor.id);
  if (!result.success) return result;

  revalidatePath("/agency/team");
  return { success: true };
}

async function requireInvitationAdmin(invitationId: string) {
  const actor = await requireCurrentMember();
  const invitation = await prisma.agencyInvitation.findFirst({
    where: { id: invitationId, organizationId: actor.organizationId },
    select: { agencyId: true },
  });
  if (!invitation) return { actor, allowed: false as const, error: "Invitation not found." };
  if (!isAgencyAdmin(actor, invitation.agencyId)) {
    return { actor, allowed: false as const, error: "Only an Owner or Manager can manage invitations." };
  }
  return { actor, allowed: true as const };
}

export async function resendAgencyInvitationAction(invitationId: string): Promise<AgencyInvitationFormResult> {
  const check = await requireInvitationAdmin(invitationId);
  if (!check.allowed) return { success: false, error: check.error };

  const result = await resendAgencyInvitation(check.actor.organizationId, invitationId);
  revalidatePath("/agency/team");
  return result;
}

export async function revokeAgencyInvitationAction(invitationId: string): Promise<AgencyInvitationFormResult> {
  const check = await requireInvitationAdmin(invitationId);
  if (!check.allowed) return { success: false, error: check.error };

  const result = await revokeAgencyInvitation(check.actor.organizationId, invitationId, check.actor.id);
  revalidatePath("/agency/team");
  return result;
}

export type AcceptInvitationActionResult = { success: true; agencyName: string } | { success: false; error: string };

/** Called from the invite-accept page by an already-authenticated member. */
export async function acceptAgencyInvitationAction(token: string): Promise<AcceptInvitationActionResult> {
  const actor = await requireCurrentMember();
  const result = await acceptAgencyInvitation(actor.organizationId, token, actor.id);
  if (result.success) {
    revalidatePath("/agency");
    revalidatePath("/agency/team");
  }
  return result;
}

/** Public — no account required, matching the accept page's trust model for the "not interested"
 * path (see declineAgencyInvitation's own comment). */
export async function declineAgencyInvitationAction(token: string): Promise<AgencyInvitationFormResult> {
  return declineAgencyInvitation(token);
}
