import "server-only";

import { addDays } from "date-fns";
import type { AgencyMemberRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { EmailService } from "@/lib/email/email-service";
import { generateInvitationToken } from "@/features/admin/services/invitations.service";
import { AGENCY_INVITATION_EXPIRY_DAYS } from "@/features/agencies/config/agency-team-config";
import { notifyAgencyAdmins } from "@/features/agencies/services/agency-access.service";
import { logAgencyActivity } from "@/features/agencies/services/agency-activity.service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type AgencyInvitationActionResult = { success: true; invitationId: string } | { success: false; error: string };

/**
 * "Invite ↓ Email sent." Creates the AgencyInvitation row and emails the
 * invitee directly (not via notifyAgencyAdmins — they aren't a Member yet,
 * so there's no in-app notification to send them). The agency's other
 * admins DO get an in-app+email heads-up, same as every other team event.
 */
export async function createAgencyInvitation(
  organizationId: string,
  agencyId: string,
  fullName: string,
  email: string,
  role: AgencyMemberRole,
  invitedById: string
): Promise<AgencyInvitationActionResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const existingMember = await prisma.member.findFirst({
    where: { organizationId, email: normalizedEmail, deletedAt: null },
    select: { id: true, agencyId: true },
  });
  if (existingMember?.agencyId || existingMember?.id === agencyId) {
    return { success: false, error: "This person is already part of an agency team." };
  }

  const existingPending = await prisma.agencyInvitation.findFirst({
    where: { organizationId, agencyId, email: normalizedEmail, status: "PENDING" },
    select: { id: true },
  });
  if (existingPending) return { success: false, error: "There's already a pending invitation for this email." };

  const [agency, inviter] = await Promise.all([
    prisma.member.findFirst({ where: { id: agencyId, organizationId, deletedAt: null }, select: { fullName: true } }),
    prisma.member.findUniqueOrThrow({ where: { id: invitedById }, select: { fullName: true } }),
  ]);
  if (!agency) return { success: false, error: "Agency not found." };

  const invitation = await prisma.agencyInvitation.create({
    data: {
      organizationId,
      agencyId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      role,
      token: generateInvitationToken(),
      invitedById,
      expiresAt: addDays(new Date(), AGENCY_INVITATION_EXPIRY_DAYS),
    },
  });

  await logAudit({
    organizationId,
    actorId: invitedById,
    action: "agency.invitation_sent",
    entityType: "agency_invitation",
    entityId: invitation.id,
    after: { email: normalizedEmail, role, agencyId },
  });
  await logAgencyActivity({
    organizationId,
    agencyId,
    type: "INVITATION_SENT",
    actorId: invitedById,
    message: `${inviter.fullName} invited ${invitation.fullName} as ${role}`,
  });
  await notifyAgencyAdmins(organizationId, agencyId, {
    type: "TEAM_INVITATION_SENT",
    title: `${inviter.fullName} invited ${invitation.fullName}`,
    body: `${invitation.fullName} (${normalizedEmail}) was invited as ${role}.`,
    excludeMemberId: invitedById,
  });

  await EmailService.sendAgencyTeamActivityEmail({
    to: normalizedEmail,
    fullName: invitation.fullName,
    headline: `You're invited to join ${agency.fullName} on CreatorHub360`,
    body: `${inviter.fullName} invited you to join their team as ${role}. This invitation expires in ${AGENCY_INVITATION_EXPIRY_DAYS} days.`,
    ctaUrl: `${APP_URL}/agency-invite/${invitation.token}`,
    ctaLabel: "View Invitation",
    organizationId,
  });

  return { success: true, invitationId: invitation.id };
}

export type AgencyInvitationSimpleResult = { success: true } | { success: false; error: string };

export async function resendAgencyInvitation(organizationId: string, invitationId: string): Promise<AgencyInvitationSimpleResult> {
  const invitation = await prisma.agencyInvitation.findFirst({
    where: { id: invitationId, organizationId, status: "PENDING" },
    include: { agency: { select: { fullName: true } } },
  });
  if (!invitation) return { success: false, error: "Invitation not found or already resolved." };

  const newExpiresAt = addDays(new Date(), AGENCY_INVITATION_EXPIRY_DAYS);
  await prisma.agencyInvitation.update({ where: { id: invitation.id }, data: { expiresAt: newExpiresAt } });

  await EmailService.sendAgencyTeamActivityEmail({
    to: invitation.email,
    fullName: invitation.fullName,
    headline: `Reminder: you're invited to join ${invitation.agency.fullName}`,
    body: `This invitation now expires in ${AGENCY_INVITATION_EXPIRY_DAYS} days.`,
    ctaUrl: `${APP_URL}/agency-invite/${invitation.token}`,
    ctaLabel: "View Invitation",
    organizationId,
  });

  return { success: true };
}

export async function revokeAgencyInvitation(organizationId: string, invitationId: string, actorId: string): Promise<AgencyInvitationSimpleResult> {
  const invitation = await prisma.agencyInvitation.findFirst({
    where: { id: invitationId, organizationId, status: "PENDING" },
  });
  if (!invitation) return { success: false, error: "Invitation not found or already resolved." };

  await prisma.agencyInvitation.update({ where: { id: invitation.id }, data: { status: "REVOKED", revokedAt: new Date() } });

  await logAudit({
    organizationId,
    actorId,
    action: "agency.invitation_revoked",
    entityType: "agency_invitation",
    entityId: invitation.id,
    before: { status: "PENDING" },
    after: { status: "REVOKED" },
  });
  await logAgencyActivity({
    organizationId,
    agencyId: invitation.agencyId,
    type: "INVITATION_REVOKED",
    actorId,
    message: `Invitation to ${invitation.fullName} was revoked`,
  });

  return { success: true };
}

export type ValidatedAgencyInvitation = {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  role: AgencyMemberRole;
  agencyId: string;
  agencyName: string;
};

/** Lazy expiry check, same convention as the platform Invitation model's getValidInvitation. */
export async function getValidAgencyInvitation(token: string): Promise<ValidatedAgencyInvitation | null> {
  const invitation = await prisma.agencyInvitation.findUnique({
    where: { token },
    include: { agency: { select: { fullName: true } } },
  });
  if (!invitation) return null;
  if (invitation.status !== "PENDING") return null;
  if (invitation.expiresAt < new Date()) return null;
  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    fullName: invitation.fullName,
    email: invitation.email,
    role: invitation.role,
    agencyId: invitation.agencyId,
    agencyName: invitation.agency.fullName,
  };
}

export type AcceptInvitationResult = { success: true; agencyName: string } | { success: false; error: string };

/**
 * "Recipient clicks invitation → Signs in ... → Automatically joins agency."
 * The already-logged-in path: sets Member.agencyId/agencyRole directly — the
 * invitation itself is the approval, so this never goes through
 * AgencyAccessRequest. Never mints a new referralCode either, same
 * inheritance guarantee as every other join path.
 */
export async function acceptAgencyInvitation(organizationId: string, token: string, memberId: string): Promise<AcceptInvitationResult> {
  const invitation = await getValidAgencyInvitation(token);
  if (!invitation) return { success: false, error: "This invitation is invalid or has expired." };

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId, deletedAt: null },
    select: { id: true, fullName: true, email: true, agencyId: true },
  });
  if (!member) return { success: false, error: "Member not found." };
  if (member.agencyId) return { success: false, error: "This account already belongs to an agency." };

  const now = new Date();
  await prisma.$transaction([
    prisma.member.update({ where: { id: memberId }, data: { agencyId: invitation.agencyId, agencyRole: invitation.role } }),
    prisma.agencyInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: now, acceptedById: memberId },
    }),
  ]);

  await logAudit({
    organizationId,
    actorId: memberId,
    action: "agency.invitation_accepted",
    entityType: "member",
    entityId: memberId,
    after: { agencyId: invitation.agencyId, role: invitation.role },
  });
  await logAgencyActivity({
    organizationId,
    agencyId: invitation.agencyId,
    type: "INVITATION_ACCEPTED",
    actorId: memberId,
    targetId: memberId,
    message: `${member.fullName} accepted their invitation and joined as ${invitation.role}`,
  });
  await notifyAgencyAdmins(organizationId, invitation.agencyId, {
    type: "TEAM_INVITATION_ACCEPTED",
    title: `${member.fullName} joined the team`,
    body: `${member.fullName} accepted their invitation and is now ${invitation.role === "STAFF" ? "Staff" : `a ${invitation.role === "OWNER" ? "n Owner" : "Manager"}`}.`,
  });

  return { success: true, agencyName: invitation.agencyName };
}

/** Public decline — no account required, just the token, matching the accept page's trust
 * model (anyone with the invitation link can decline it, same as they could ignore the email). */
export async function declineAgencyInvitation(token: string): Promise<AgencyInvitationSimpleResult> {
  const invitation = await getValidAgencyInvitation(token);
  if (!invitation) return { success: false, error: "This invitation is invalid or has expired." };

  await prisma.agencyInvitation.update({
    where: { id: invitation.id },
    data: { status: "DECLINED", declinedAt: new Date() },
  });

  await logAgencyActivity({
    organizationId: invitation.organizationId,
    agencyId: invitation.agencyId,
    type: "INVITATION_DECLINED",
    actorId: null,
    message: `${invitation.fullName} declined their invitation`,
  });
  await notifyAgencyAdmins(invitation.organizationId, invitation.agencyId, {
    type: "TEAM_INVITATION_DECLINED",
    title: `${invitation.fullName} declined their invitation`,
    body: `${invitation.fullName} (${invitation.email}) declined the invitation to join your team.`,
  });

  return { success: true };
}

export async function listAgencyInvitations(organizationId: string, agencyId: string) {
  return prisma.agencyInvitation.findMany({
    where: { organizationId, agencyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
