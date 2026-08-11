import "server-only";

import { addDays } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { EmailService } from "@/lib/email/email-service";
import { generateInvitationToken } from "@/features/admin/services/invitations.service";
import { AGENCY_INVITATION_EXPIRY_DAYS } from "@/features/agencies/config/agency-team-config";
import { logAgencyActivity } from "@/features/agencies/services/agency-activity.service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type BrandInvitationActionResult = { success: true; invitationId: string } | { success: false; error: string };

/**
 * Invites a named Brand Contact by email — mirrors createAgencyInvitation
 * exactly, just scoped to a Brand instead of an agency team. Acceptance
 * creates/links a Member(role: BRAND, brandId) who gets the read-mostly
 * portal, not agency-team access.
 */
export async function createBrandInvitation(
  organizationId: string,
  brandId: string,
  agencyId: string,
  fullName: string,
  email: string,
  invitedById: string
): Promise<BrandInvitationActionResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const existingMember = await prisma.member.findFirst({
    where: { organizationId, email: normalizedEmail, deletedAt: null },
    select: { id: true, brandId: true },
  });
  if (existingMember?.brandId) return { success: false, error: "This person is already connected to a brand." };

  const existingPending = await prisma.brandInvitation.findFirst({
    where: { organizationId, brandId, email: normalizedEmail, status: "PENDING" },
    select: { id: true },
  });
  if (existingPending) return { success: false, error: "There's already a pending invitation for this email." };

  const [brand, inviter] = await Promise.all([
    prisma.brand.findFirst({ where: { id: brandId, organizationId }, select: { name: true } }),
    prisma.member.findUniqueOrThrow({ where: { id: invitedById }, select: { fullName: true } }),
  ]);
  if (!brand) return { success: false, error: "Brand not found." };

  const invitation = await prisma.brandInvitation.create({
    data: {
      organizationId,
      brandId,
      agencyId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      token: generateInvitationToken(),
      invitedById,
      expiresAt: addDays(new Date(), AGENCY_INVITATION_EXPIRY_DAYS),
    },
  });

  await logAudit({
    organizationId,
    actorId: invitedById,
    action: "brand_invitation.sent",
    entityType: "brand_invitation",
    entityId: invitation.id,
    after: { email: normalizedEmail, brandId },
  });
  await logAgencyActivity({
    organizationId,
    agencyId,
    type: "INVITATION_SENT",
    actorId: invitedById,
    message: `${inviter.fullName} invited ${invitation.fullName} as a Brand Contact for ${brand.name}`,
  });

  await EmailService.sendAgencyTeamActivityEmail({
    to: normalizedEmail,
    fullName: invitation.fullName,
    headline: `You're invited to ${brand.name}'s portal on CreatorHub360`,
    body: `${inviter.fullName} invited you to view ${brand.name}'s campaigns, contracts, and invoices. This invitation expires in ${AGENCY_INVITATION_EXPIRY_DAYS} days.`,
    ctaUrl: `${APP_URL}/brand-invite/${invitation.token}`,
    ctaLabel: "View Invitation",
    organizationId,
  });

  return { success: true, invitationId: invitation.id };
}

export type BrandInvitationSimpleResult = { success: true } | { success: false; error: string };

export async function revokeBrandInvitation(organizationId: string, invitationId: string, actorId: string): Promise<BrandInvitationSimpleResult> {
  const invitation = await prisma.brandInvitation.findFirst({ where: { id: invitationId, organizationId, status: "PENDING" } });
  if (!invitation) return { success: false, error: "Invitation not found or already resolved." };

  await prisma.brandInvitation.update({ where: { id: invitation.id }, data: { status: "REVOKED" } });

  await logAudit({
    organizationId,
    actorId,
    action: "brand_invitation.revoked",
    entityType: "brand_invitation",
    entityId: invitation.id,
  });

  return { success: true };
}

export type ValidatedBrandInvitation = {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  brandId: string;
  brandName: string;
};

export async function getValidBrandInvitation(token: string): Promise<ValidatedBrandInvitation | null> {
  const invitation = await prisma.brandInvitation.findUnique({ where: { token }, include: { brand: { select: { name: true } } } });
  if (!invitation) return null;
  if (invitation.status !== "PENDING") return null;
  if (invitation.expiresAt < new Date()) return null;
  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    fullName: invitation.fullName,
    email: invitation.email,
    brandId: invitation.brandId,
    brandName: invitation.brand.name,
  };
}

export type AcceptBrandInvitationResult = { success: true; brandName: string } | { success: false; error: string };

/** The already-logged-in path: sets Member.role=BRAND + brandId directly — the invitation itself is the approval. */
export async function acceptBrandInvitation(organizationId: string, token: string, memberId: string): Promise<AcceptBrandInvitationResult> {
  const invitation = await getValidBrandInvitation(token);
  if (!invitation) return { success: false, error: "This invitation is invalid or has expired." };

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId, deletedAt: null },
    select: { id: true, fullName: true, brandId: true },
  });
  if (!member) return { success: false, error: "Member not found." };
  if (member.brandId) return { success: false, error: "This account already belongs to a brand." };

  await prisma.$transaction([
    prisma.member.update({ where: { id: memberId }, data: { role: "BRAND", brandId: invitation.brandId } }),
    prisma.brandInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedById: memberId } }),
  ]);

  await logAudit({
    organizationId,
    actorId: memberId,
    action: "brand_invitation.accepted",
    entityType: "member",
    entityId: memberId,
    after: { brandId: invitation.brandId },
  });
  await logAgencyActivity({
    organizationId,
    agencyId: (await prisma.brandInvitation.findUniqueOrThrow({ where: { id: invitation.id }, select: { agencyId: true } })).agencyId,
    type: "INVITATION_ACCEPTED",
    actorId: memberId,
    targetId: memberId,
    message: `${member.fullName} accepted their invitation and joined ${invitation.brandName}'s portal`,
  });

  return { success: true, brandName: invitation.brandName };
}

export async function listBrandInvitations(organizationId: string, brandId: string) {
  return prisma.brandInvitation.findMany({ where: { organizationId, brandId }, orderBy: { createdAt: "desc" }, take: 50 });
}

/** Public — no account required, matching the agency-invite accept page's "not interested" path. */
export async function declineBrandInvitation(token: string): Promise<BrandInvitationSimpleResult> {
  const invitation = await getValidBrandInvitation(token);
  if (!invitation) return { success: false, error: "This invitation is invalid or has expired." };

  await prisma.brandInvitation.update({ where: { id: invitation.id }, data: { status: "DECLINED" } });

  await logAgencyActivity({
    organizationId: invitation.organizationId,
    agencyId: (await prisma.brandInvitation.findUniqueOrThrow({ where: { id: invitation.id }, select: { agencyId: true } })).agencyId,
    type: "INVITATION_DECLINED",
    actorId: null,
    message: `${invitation.fullName} declined their invitation to ${invitation.brandName}'s portal`,
  });

  return { success: true };
}
