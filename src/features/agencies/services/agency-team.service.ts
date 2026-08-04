import "server-only";

import type { AgencyMemberRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { notifyMembers } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";
import { isReferralEligibleRole } from "@/features/referrals/config/referral-config";
import { countActiveOwners, notifyAgencyAdmins } from "@/features/agencies/services/agency-access.service";
import { logAgencyActivity } from "@/features/agencies/services/agency-activity.service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const LAST_OWNER_ERROR = "This agency must always have at least one Owner. Transfer ownership before continuing.";

export type AgencyTeamActionResult = { success: true } | { success: false; error: string };

/**
 * "Prevent Orphaned Agencies" — the single guard every path that could
 * remove, demote, or relocate an Owner must call first (leave, remove,
 * role-change-away-from-Owner, account deletion). Not used by
 * transferOwnership, which never reduces the Owner count (it swaps one
 * Owner for another inside one transaction).
 */
export async function assertOwnershipSafe(organizationId: string, agencyId: string, memberId: string): Promise<AgencyTeamActionResult> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId },
    select: { agencyRole: true },
  });
  if (!member) return { success: true };

  // A canonical member (memberId === agencyId) with a null agencyRole counts
  // as an implicit Owner, same convention as countActiveOwners.
  const isOwner =
    memberId === agencyId
      ? member.agencyRole !== "MANAGER" && member.agencyRole !== "STAFF"
      : member.agencyRole === "OWNER";
  if (!isOwner) return { success: true };

  const activeOwners = await countActiveOwners(organizationId, agencyId);
  if (activeOwners <= 1) return { success: false, error: LAST_OWNER_ERROR };
  return { success: true };
}

/** Resolves which agency (if any) a member's team-membership guard should apply to — their own
 * canonical identity if they're a referral-eligible root account, or the agency they joined. Null
 * for members with no agency-team involvement at all (most Members). Exported for the account
 * deletion guard in members/services/actions.ts. */
export function resolveMemberAgencyContext(member: { id: string; role: string; agencyId: string | null }): string | null {
  if (member.agencyId) return member.agencyId;
  if (isReferralEligibleRole(member.role as Parameters<typeof isReferralEligibleRole>[0])) return member.id;
  return null;
}

async function removeFromTeam(
  organizationId: string,
  agencyId: string,
  memberId: string,
  actorId: string | null,
  notifyRemoved: boolean
): Promise<AgencyTeamActionResult> {
  if (memberId === agencyId) {
    return { success: false, error: "The agency's founding account can't be removed — transfer ownership or delete the account instead." };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId, agencyId },
    select: { id: true, fullName: true, email: true, agencyRole: true },
  });
  if (!member) return { success: false, error: "Team member not found." };

  const guard = await assertOwnershipSafe(organizationId, agencyId, memberId);
  if (!guard.success) return guard;

  await prisma.member.update({ where: { id: memberId }, data: { agencyId: null, agencyRole: null } });

  await logAudit({
    organizationId,
    actorId: actorId ?? memberId,
    action: "agency.team_member_removed",
    entityType: "member",
    entityId: memberId,
    before: { agencyId, agencyRole: member.agencyRole },
    after: { agencyId: null, agencyRole: null },
  });
  await logAgencyActivity({
    organizationId,
    agencyId,
    type: "TEAM_MEMBER_REMOVED",
    actorId,
    targetId: memberId,
    message: actorId === memberId ? `${member.fullName} left the team` : `${member.fullName} was removed from the team`,
  });
  await notifyAgencyAdmins(organizationId, agencyId, {
    type: "TEAM_MEMBER_REMOVED",
    title: `${member.fullName} is no longer on the team`,
    body: actorId === memberId ? `${member.fullName} left the agency.` : `${member.fullName} was removed from the agency.`,
    excludeMemberId: actorId ?? undefined,
  });
  if (notifyRemoved) {
    await notifyMembers([member.id], {
      type: "TEAM_MEMBER_REMOVED",
      title: "You were removed from the team",
      body: "You no longer have access to this agency's dashboard.",
    });
    await EmailService.sendAgencyTeamActivityEmail({
      to: member.email,
      fullName: member.fullName,
      headline: "You were removed from the team",
      body: "You no longer have access to this agency's dashboard.",
      organizationId,
      memberId: member.id,
    });
  }

  return { success: true };
}

/** Owner/Manager-initiated removal of another team member. */
export async function removeTeamMember(organizationId: string, agencyId: string, memberId: string, actorId: string): Promise<AgencyTeamActionResult> {
  return removeFromTeam(organizationId, agencyId, memberId, actorId, true);
}

/** Self-service — a team member leaves on their own. */
export async function leaveAgency(organizationId: string, memberId: string): Promise<AgencyTeamActionResult> {
  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId }, select: { agencyId: true } });
  if (!member) return { success: false, error: "Member not found." };
  if (!member.agencyId) {
    return { success: false, error: "You're the founding account of this agency and can't leave it. Transfer ownership or delete your account instead." };
  }
  return removeFromTeam(organizationId, member.agencyId, memberId, memberId, false);
}

/** Promote/demote an existing team member. Guarded against demoting the last Owner. */
export async function updateTeamMemberRole(
  organizationId: string,
  agencyId: string,
  memberId: string,
  newRole: AgencyMemberRole,
  actorId: string
): Promise<AgencyTeamActionResult> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId, OR: [{ id: agencyId }, { agencyId }] },
    select: { id: true, fullName: true, email: true, agencyRole: true },
  });
  if (!member) return { success: false, error: "Team member not found." };
  if (member.agencyRole === newRole) return { success: true };

  if (newRole !== "OWNER") {
    const guard = await assertOwnershipSafe(organizationId, agencyId, memberId);
    if (!guard.success) return guard;
  }

  const before = member.agencyRole;
  await prisma.member.update({ where: { id: memberId }, data: { agencyRole: newRole } });

  await logAudit({
    organizationId,
    actorId,
    action: "agency.team_member_role_changed",
    entityType: "member",
    entityId: memberId,
    before: { agencyRole: before },
    after: { agencyRole: newRole },
  });
  await logAgencyActivity({
    organizationId,
    agencyId,
    type: "ROLE_CHANGED",
    actorId,
    targetId: memberId,
    message: `${member.fullName} was changed from ${before ?? "Staff"} to ${newRole}`,
  });
  await notifyAgencyAdmins(organizationId, agencyId, {
    type: "TEAM_ROLE_CHANGED",
    title: `${member.fullName}'s role changed`,
    body: `${member.fullName} is now ${newRole === "OWNER" ? "an Owner" : newRole === "MANAGER" ? "a Manager" : "Staff"}.`,
    excludeMemberId: actorId,
  });
  await notifyMembers([member.id], {
    type: "TEAM_ROLE_CHANGED",
    title: "Your role changed",
    body: `You're now ${newRole === "OWNER" ? "an Owner" : newRole === "MANAGER" ? "a Manager" : "Staff"} on your agency's team.`,
    link: "/agency/team",
  });

  return { success: true };
}

export type TransferOwnershipResult = AgencyTeamActionResult;

/**
 * "Owner selects another active Owner or Manager ... New Owner ↓ Old Owner
 * automatically becomes Manager." Never reduces the active-Owner count (one
 * Owner replaces another inside a single transaction), so this doesn't need
 * the last-owner guard — it IS the escape hatch that guard points people
 * toward.
 */
export async function transferOwnership(
  organizationId: string,
  agencyId: string,
  fromMemberId: string,
  toMemberId: string
): Promise<TransferOwnershipResult> {
  if (fromMemberId === toMemberId) return { success: false, error: "You're already the Owner." };

  const [fromMember, toMember] = await Promise.all([
    prisma.member.findFirst({ where: { id: fromMemberId, organizationId }, select: { id: true, fullName: true, email: true } }),
    prisma.member.findFirst({
      where: { id: toMemberId, organizationId, status: "ACTIVE", OR: [{ id: agencyId }, { agencyId }] },
      select: { id: true, fullName: true, email: true, agencyRole: true },
    }),
  ]);
  if (!fromMember) return { success: false, error: "Member not found." };
  if (!toMember) return { success: false, error: "That person isn't an active member of this agency." };
  if (toMember.agencyRole !== "OWNER" && toMember.agencyRole !== "MANAGER") {
    return { success: false, error: "Ownership can only be transferred to an active Owner or Manager." };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.member.update({ where: { id: toMemberId }, data: { agencyRole: "OWNER" } }),
    prisma.member.update({ where: { id: fromMemberId }, data: { agencyRole: "MANAGER" } }),
  ]);

  await logAudit({
    organizationId,
    actorId: fromMemberId,
    action: "agency.ownership_transferred",
    entityType: "member",
    entityId: agencyId,
    before: { previousOwnerId: fromMemberId, previousOwnerName: fromMember.fullName },
    after: { newOwnerId: toMemberId, newOwnerName: toMember.fullName, timestamp: now.toISOString() },
  });
  await logAgencyActivity({
    organizationId,
    agencyId,
    type: "OWNERSHIP_TRANSFERRED",
    actorId: fromMemberId,
    targetId: toMemberId,
    message: `Ownership transferred from ${fromMember.fullName} to ${toMember.fullName}`,
  });

  await notifyAgencyAdmins(organizationId, agencyId, {
    type: "TEAM_OWNERSHIP_TRANSFERRED",
    title: "Agency ownership was transferred",
    body: `${toMember.fullName} is now the Owner. ${fromMember.fullName} is now a Manager.`,
  });
  await EmailService.sendAgencyTeamActivityEmail({
    to: toMember.email,
    fullName: toMember.fullName,
    headline: "You're now the Owner",
    body: `${fromMember.fullName} transferred ownership of the agency to you.`,
    ctaUrl: `${APP_URL}/agency/team`,
    organizationId,
    memberId: toMember.id,
  });

  return { success: true };
}
