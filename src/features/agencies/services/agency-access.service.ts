import "server-only";

import type { AgencyMemberRole, MemberStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { notifyMembers } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";
import { logAgencyActivity } from "@/features/agencies/services/agency-activity.service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Fans a Team Management event out to every current admin (Owner/Manager)
 * of an agency — "Notify agency Owners and Managers when [invitation sent,
 * role changed, ownership transferred, ...]." `excludeMemberId` skips the
 * actor themselves when they're already an admin, so they don't get
 * notified about their own action. In-app + email, matching every other
 * notification path in this codebase.
 */
export async function notifyAgencyAdmins(
  organizationId: string,
  agencyId: string,
  input: { type: NotificationType; title: string; body: string; link?: string; excludeMemberId?: string }
): Promise<void> {
  const admins = (await getAgencyAdmins(organizationId, agencyId)).filter((a) => a.id !== input.excludeMemberId);
  if (admins.length === 0) return;

  await notifyMembers(admins.map((a) => a.id), {
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? "/agency/team",
  });

  for (const admin of admins) {
    await EmailService.sendAgencyTeamActivityEmail({
      to: admin.email,
      fullName: admin.fullName,
      headline: input.title,
      body: input.body,
      ctaUrl: `${APP_URL}${input.link ?? "/agency/team"}`,
      organizationId,
      memberId: admin.id,
    });
  }
}

/** Canonical agency member (agencyId null) plus any ACTIVE team members with OWNER/MANAGER — the
 * set of people who count as "Existing Agency Admin(s)" for notification and approval purposes. */
export async function getAgencyAdmins(organizationId: string, agencyId: string) {
  return prisma.member.findMany({
    where: {
      organizationId,
      deletedAt: null,
      OR: [
        { id: agencyId },
        { agencyId, agencyRole: { in: ["OWNER", "MANAGER"] } },
      ],
    },
    select: { id: true, fullName: true, email: true },
  });
}

async function notifyAgencyAdminsOfAccessRequest(organizationId: string, agencyId: string, requesterName: string) {
  const admins = await getAgencyAdmins(organizationId, agencyId);
  if (admins.length === 0) return;

  await notifyMembers(admins.map((a) => a.id), {
    type: "AGENCY_ACCESS_REQUESTED",
    title: `${requesterName} wants to join your agency`,
    body: `${requesterName} is requesting access to your agency's dashboard. Review it to approve or reject.`,
    link: "/agency",
  });

  for (const admin of admins) {
    await EmailService.sendAgencyAccessRequestedEmail({
      to: admin.email,
      fullName: admin.fullName,
      requesterName,
      reviewUrl: `${APP_URL}/agency`,
      organizationId,
      memberId: admin.id,
    });
  }
}

export type RequestAgencyAccessResult =
  | { success: true; agencyName: string }
  | { success: false; error: string };

/**
 * "User clicks Request Access ... Existing Agency Admin(s) receive a
 * notification" — creates the PENDING request and fans the notification out
 * to every current admin of that agency. Never touches Member.agencyId
 * itself; that only happens on approval (see approveAgencyAccessRequest).
 */
export async function requestAgencyAccess(
  organizationId: string,
  agencyId: string,
  requesterId: string,
  role: AgencyMemberRole,
  requestNote?: string
): Promise<RequestAgencyAccessResult> {
  const [agency, requester] = await Promise.all([
    prisma.member.findFirst({
      where: { id: agencyId, organizationId, deletedAt: null, agencyId: null },
      select: { id: true, fullName: true },
    }),
    prisma.member.findFirst({
      where: { id: requesterId, organizationId, deletedAt: null },
      select: { id: true, fullName: true, agencyId: true },
    }),
  ]);
  if (!agency) return { success: false, error: "We couldn't find that agency." };
  if (!requester) return { success: false, error: "Member not found." };
  if (requester.agencyId) return { success: false, error: "This account already belongs to an agency." };

  const existing = await prisma.agencyAccessRequest.findUnique({ where: { requesterId }, select: { status: true } });
  if (existing?.status === "PENDING") {
    return { success: false, error: "You already have a pending access request." };
  }

  const trimmedNote = requestNote?.trim() || null;
  if (existing) {
    await prisma.agencyAccessRequest.update({
      where: { requesterId },
      data: {
        agencyId,
        role,
        status: "PENDING",
        requestedAt: new Date(),
        decidedAt: null,
        decidedById: null,
        reviewNote: null,
        requestNote: trimmedNote,
      },
    });
  } else {
    await prisma.agencyAccessRequest.create({
      data: { organizationId, agencyId, requesterId, role, requestNote: trimmedNote },
    });
  }

  await notifyAgencyAdminsOfAccessRequest(organizationId, agencyId, requester.fullName);
  await logAgencyActivity({
    organizationId,
    agencyId,
    type: "CREATOR_REQUEST_RECEIVED",
    actorId: null,
    targetId: requesterId,
    message: `${requester.fullName} requested to join as ${role === "OWNER" ? "an Owner" : role === "MANAGER" ? "a Manager" : "Staff"}`,
  });

  return { success: true, agencyName: agency.fullName };
}

export type AgencyAccessDecisionResult =
  | { success: true; requesterId: string; requesterName: string; agencyName: string }
  | { success: false; error: string };

/**
 * "If approved: User is added as a member of the existing agency. They do
 * not receive a new Agency ID. They inherit the agency's existing Agency ID
 * and creator network." Sets Member.agencyId/agencyRole on the requester —
 * referralCode is never touched, which is exactly what makes the inheritance
 * true by construction rather than something this function has to fake.
 */
export async function approveAgencyAccessRequest(
  organizationId: string,
  requestId: string,
  agencyId: string,
  actorId?: string
): Promise<AgencyAccessDecisionResult> {
  const request = await prisma.agencyAccessRequest.findFirst({
    where: { id: requestId, organizationId, agencyId, status: "PENDING" },
    include: { agency: { select: { fullName: true } } },
  });
  if (!request) return { success: false, error: "Request not found or already reviewed." };

  const now = new Date();
  await prisma.$transaction([
    prisma.member.update({
      where: { id: request.requesterId },
      data: { agencyId: request.agencyId, agencyRole: request.role },
    }),
    prisma.agencyAccessRequest.update({
      where: { id: request.id },
      data: { status: "ACTIVE", decidedAt: now },
    }),
  ]);

  const requester = await prisma.member.findUniqueOrThrow({
    where: { id: request.requesterId },
    select: { id: true, fullName: true, email: true },
  });

  await notifyMembers([requester.id], {
    type: "AGENCY_ACCESS_APPROVED",
    title: "Your agency access request was approved",
    body: `You're now part of ${request.agency.fullName}.`,
    link: "/agency",
  });
  await EmailService.sendAgencyAccessApprovedEmail({
    to: requester.email,
    fullName: requester.fullName,
    agencyName: request.agency.fullName,
    organizationId,
    memberId: requester.id,
  });
  await notifyMembers(
    (await getAgencyAdmins(organizationId, agencyId))
      .map((a) => a.id)
      .filter((id) => id !== actorId && id !== requester.id),
    {
      type: "AGENCY_REQUEST_APPROVED",
      title: `${requester.fullName} joined the team`,
      body: `${requester.fullName}'s request to join was approved and they're now part of your agency.`,
      link: "/agency/team",
    }
  );
  await logAgencyActivity({
    organizationId,
    agencyId,
    type: "CREATOR_APPROVED",
    actorId: actorId ?? null,
    targetId: requester.id,
    message: `${requester.fullName}'s request to join was approved`,
  });
  await logAgencyActivity({
    organizationId,
    agencyId,
    type: "CREATOR_JOINED",
    actorId: null,
    targetId: requester.id,
    message: `${requester.fullName} joined the agency`,
  });

  return { success: true, requesterId: requester.id, requesterName: requester.fullName, agencyName: request.agency.fullName };
}

/** "If rejected: No access is granted." The requester's Member.agencyId stays null — they keep
 * their platform account, just without agency access, and may be reviewed again later if reused. */
export async function rejectAgencyAccessRequest(
  organizationId: string,
  requestId: string,
  agencyId: string,
  reviewNote?: string,
  actorId?: string
): Promise<AgencyAccessDecisionResult> {
  const request = await prisma.agencyAccessRequest.findFirst({
    where: { id: requestId, organizationId, agencyId, status: "PENDING" },
    include: { agency: { select: { fullName: true } } },
  });
  if (!request) return { success: false, error: "Request not found or already reviewed." };

  await prisma.agencyAccessRequest.update({
    where: { id: request.id },
    data: { status: "REJECTED", decidedAt: new Date(), reviewNote: reviewNote?.trim() || null },
  });

  const requester = await prisma.member.findUniqueOrThrow({
    where: { id: request.requesterId },
    select: { id: true, fullName: true, email: true },
  });

  await notifyMembers([requester.id], {
    type: "AGENCY_ACCESS_REJECTED",
    title: "Your agency access request was declined",
    body: `${request.agency.fullName} declined your request.`,
  });
  await EmailService.sendAgencyAccessRejectedEmail({
    to: requester.email,
    fullName: requester.fullName,
    agencyName: request.agency.fullName,
    organizationId,
    memberId: requester.id,
  });
  await notifyAgencyAdmins(organizationId, agencyId, {
    type: "AGENCY_REQUEST_REJECTED",
    title: `${requester.fullName}'s request was declined`,
    body: `${requester.fullName}'s request to join was declined.`,
    excludeMemberId: actorId,
  });
  await logAgencyActivity({
    organizationId,
    agencyId,
    type: "CREATOR_REJECTED",
    actorId: actorId ?? null,
    targetId: requester.id,
    message: `${requester.fullName}'s request to join was declined`,
  });

  return { success: true, requesterId: requester.id, requesterName: requester.fullName, agencyName: request.agency.fullName };
}

/**
 * "Only Super Admins may override this process." Skips the pending-request
 * step entirely — grants access directly, still audit-logged distinctly
 * from a normal approval so the override is visible in the trail.
 */
export async function overrideAgencyAccess(
  organizationId: string,
  requesterId: string,
  agencyId: string,
  role: AgencyMemberRole,
  actorId: string
): Promise<AgencyAccessDecisionResult> {
  const [agency, requester] = await Promise.all([
    prisma.member.findFirst({ where: { id: agencyId, organizationId, deletedAt: null, agencyId: null }, select: { id: true, fullName: true } }),
    prisma.member.findFirst({ where: { id: requesterId, organizationId, deletedAt: null }, select: { id: true, fullName: true, email: true } }),
  ]);
  if (!agency) return { success: false, error: "We couldn't find that agency." };
  if (!requester) return { success: false, error: "Member not found." };

  const now = new Date();
  await prisma.$transaction([
    prisma.member.update({ where: { id: requesterId }, data: { agencyId, agencyRole: role } }),
    prisma.agencyAccessRequest.upsert({
      where: { requesterId },
      create: { organizationId, agencyId, requesterId, role, status: "ACTIVE", decidedAt: now, decidedById: actorId },
      update: { agencyId, role, status: "ACTIVE", decidedAt: now, decidedById: actorId, reviewNote: "Granted via Super Admin override" },
    }),
  ]);

  await logAudit({
    organizationId,
    actorId,
    action: "agency.access_overridden",
    entityType: "member",
    entityId: requesterId,
    after: { agencyId, agencyName: agency.fullName, role },
  });

  await notifyMembers([requester.id], {
    type: "AGENCY_ACCESS_APPROVED",
    title: "You've been added to an agency",
    body: `A Super Admin added you to ${agency.fullName}.`,
    link: "/agency",
  });

  return { success: true, requesterId: requester.id, requesterName: requester.fullName, agencyName: agency.fullName };
}

export type PendingAccessRequest = {
  requestId: string;
  requesterId: string;
  fullName: string;
  email: string;
  role: AgencyMemberRole;
  requestedAt: Date;
  requestNote: string | null;
};

export async function getPendingAccessRequestsForAgency(organizationId: string, agencyId: string): Promise<PendingAccessRequest[]> {
  const requests = await prisma.agencyAccessRequest.findMany({
    where: { organizationId, agencyId, status: "PENDING" },
    include: { requester: { select: { id: true, fullName: true, email: true } } },
    orderBy: { requestedAt: "desc" },
  });
  return requests.map((r) => ({
    requestId: r.id,
    requesterId: r.requester.id,
    fullName: r.requester.fullName,
    email: r.requester.email,
    role: r.role,
    requestedAt: r.requestedAt,
    requestNote: r.requestNote,
  }));
}

export type AgencyTeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: AgencyMemberRole;
  isCanonical: boolean;
  status: MemberStatus;
};

/** Canonical agency member (the structural Agency ID/referralCode holder) plus every ACTIVE team
 * member — powers the Agency Dashboard's Team section. Role shown is always the live agencyRole,
 * never assumed — after an ownership transfer, the canonical member may well show as MANAGER. */
export async function getAgencyTeam(organizationId: string, agencyId: string): Promise<AgencyTeamMember[]> {
  const [canonical, team] = await Promise.all([
    prisma.member.findFirst({
      where: { id: agencyId, organizationId, deletedAt: null },
      select: { id: true, fullName: true, email: true, agencyRole: true, status: true },
    }),
    prisma.member.findMany({
      where: { organizationId, agencyId, deletedAt: null },
      select: { id: true, fullName: true, email: true, agencyRole: true, status: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const members: AgencyTeamMember[] = [];
  if (canonical) {
    members.push({
      id: canonical.id,
      fullName: canonical.fullName,
      email: canonical.email,
      role: canonical.agencyRole ?? "OWNER",
      isCanonical: true,
      status: canonical.status,
    });
  }
  for (const m of team) {
    members.push({ id: m.id, fullName: m.fullName, email: m.email, role: m.agencyRole ?? "STAFF", isCanonical: false, status: m.status });
  }
  return members;
}

/** How many ACTIVE members of this agency currently hold OWNER — the number "Prevent Orphaned
 * Agencies" must never let drop to zero via leave/remove/demote/transfer-away. A canonical member
 * whose agencyRole hasn't been backfilled yet (still null — pre-dates this feature) counts as an
 * implicit Owner: nothing has ever explicitly said otherwise, since only a transfer ever sets it
 * to something else. */
export async function countActiveOwners(organizationId: string, agencyId: string): Promise<number> {
  const [canonical, teamOwners] = await Promise.all([
    prisma.member.findFirst({
      where: { id: agencyId, organizationId, deletedAt: null, status: "ACTIVE" },
      select: { agencyRole: true },
    }),
    prisma.member.count({ where: { organizationId, agencyId, deletedAt: null, status: "ACTIVE", agencyRole: "OWNER" } }),
  ]);
  const canonicalCounts = canonical && canonical.agencyRole !== "MANAGER" && canonical.agencyRole !== "STAFF" ? 1 : 0;
  return canonicalCounts + teamOwners;
}

/** True if `actor` currently belongs to `agencyId` at all (canonical or a joined team member). */
function belongsToAgency(actor: { id: string; agencyId: string | null }, agencyId: string): boolean {
  return actor.id === agencyId || actor.agencyId === agencyId;
}

/** True if `actor` may approve/reject access requests, invite Staff/Managers, edit the profile,
 * etc. for `agencyId` — i.e. holds OWNER or MANAGER there. Always reads the live agencyRole; a
 * canonical member who transferred ownership away is correctly no longer an admin. */
export function isAgencyAdmin(actor: { id: string; agencyId: string | null; agencyRole: AgencyMemberRole | null }, agencyId: string): boolean {
  if (!belongsToAgency(actor, agencyId)) return false;
  return actor.agencyRole === "OWNER" || actor.agencyRole === "MANAGER";
}

/** True if `actor` holds OWNER for `agencyId` — gates ownership transfer specifically. */
export function isAgencyOwner(actor: { id: string; agencyId: string | null; agencyRole: AgencyMemberRole | null }, agencyId: string): boolean {
  if (!belongsToAgency(actor, agencyId)) return false;
  return actor.agencyRole === "OWNER";
}
