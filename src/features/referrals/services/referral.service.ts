import "server-only";

import { startOfMonth } from "date-fns";
import type { MemberRole, ReferralSource } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isReferralEligibleRole } from "@/features/referrals/config/referral-config";
import { notifyMembers } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * "Manual Agency ID Entry ... Agency receives a notification" — fired both
 * from the Apply path (once the Member exists, see connectReferralOnApproval)
 * and the direct Signup/Settings path (see requestOrConnectAgency). Silently
 * no-ops if either side vanished between the write and this read rather than
 * ever throwing — a missed notification should never surface as a user-facing
 * error on an otherwise-successful request.
 */
async function notifyAgencyOfNewRequest(organizationId: string, agencyMemberId: string, creatorMemberId: string) {
  const [agency, creator] = await Promise.all([
    prisma.member.findUnique({ where: { id: agencyMemberId }, select: { id: true, email: true, fullName: true } }),
    prisma.member.findUnique({ where: { id: creatorMemberId }, select: { fullName: true } }),
  ]);
  if (!agency || !creator) return;

  await notifyMembers([agency.id], {
    type: "AGENCY_REQUEST_RECEIVED",
    title: `New creator request: ${creator.fullName}`,
    body: `${creator.fullName} wants to connect using your Agency ID. Review it on your Agency Dashboard.`,
    link: "/agency",
  });

  await EmailService.sendAgencyRequestReceivedEmail({
    to: agency.email,
    fullName: agency.fullName,
    creatorName: creator.fullName,
    reviewUrl: `${APP_URL}/agency`,
    organizationId,
    memberId: agency.id,
  });
}

export type ReferralValidation =
  | { valid: true; referrerId: string; referrerName: string; referrerRole: MemberRole }
  | { valid: false; reason: string };

/**
 * Validates a referral code against a real, active, referral-eligible
 * member. Used twice: the apply form's live "Connected to: X" preview
 * (client-triggered, read-only), and again inside submitApplication right
 * before writing — the server never trusts whatever the client already
 * "validated".
 */
export async function validateReferralCode(organizationId: string, rawCode: string): Promise<ReferralValidation> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, reason: "Enter an Agency ID." };

  const referrer = await prisma.member.findFirst({
    where: { organizationId, referralCode: code, deletedAt: null },
    select: { id: true, fullName: true, role: true, status: true },
  });

  if (!referrer) return { valid: false, reason: "We couldn't find an agency with that ID." };
  if (!isReferralEligibleRole(referrer.role)) {
    return { valid: false, reason: "That ID doesn't belong to a referral-eligible account." };
  }
  if (referrer.status !== "ACTIVE") return { valid: false, reason: "This agency's account isn't currently active." };

  return { valid: true, referrerId: referrer.id, referrerName: referrer.fullName, referrerRole: referrer.role };
}

/**
 * Called from submitApplication when a referral code is present (QR/link
 * param or manual entry) — creates the PENDING ReferralLink row that
 * connectReferralOnApproval later activates. Silently returns null on an
 * invalid code rather than throwing: a bad/stale referral code should never
 * block someone from applying, it just doesn't get linked.
 */
export async function createReferralLinkForApplication(
  organizationId: string,
  applicationId: string,
  rawCode: string,
  source: ReferralSource
) {
  const validation = await validateReferralCode(organizationId, rawCode);
  if (!validation.valid) return null;

  return prisma.referralLink.create({
    data: {
      organizationId,
      referrerMemberId: validation.referrerId,
      referrerRole: validation.referrerRole,
      referralCode: rawCode.trim().toUpperCase(),
      source,
      applicationId,
      status: "PENDING",
    },
  });
}

/**
 * Called from approveApplicationAction right after the new Member row is
 * created. QR_CODE/LINK referrals connect immediately here — "the creator
 * intentionally joined through the agency's official referral," so this
 * remains the one and only place Member.referredByMemberId is ever set on a
 * fresh member automatically, which is what makes "prevent duplicate agency
 * assignments unless explicitly transferred" true by construction (the only
 * other writers are approveCreatorRequest, below, and transferReferral,
 * which is Super Admin-gated).
 *
 * MANUAL_ENTRY referrals never auto-connect: the Member now exists, so the
 * link's applicationId-scoped PENDING request becomes a memberId-scoped one
 * — actionable on the referring agency's dashboard — and the agency is
 * notified. Member.referredByMemberId stays null until approveCreatorRequest.
 */
export async function connectReferralOnApproval(applicationId: string, memberId: string) {
  const link = await prisma.referralLink.findUnique({ where: { applicationId } });
  if (!link) return null;

  if (link.source === "MANUAL_ENTRY") {
    const updatedLink = await prisma.referralLink.update({ where: { id: link.id }, data: { memberId } });
    await notifyAgencyOfNewRequest(updatedLink.organizationId, updatedLink.referrerMemberId, memberId);
    return updatedLink;
  }

  const now = new Date();
  const [, updatedLink] = await prisma.$transaction([
    prisma.member.update({
      where: { id: memberId },
      data: { referredByMemberId: link.referrerMemberId, referredByCode: link.referralCode },
    }),
    prisma.referralLink.update({
      where: { id: link.id },
      data: { memberId, status: "ACTIVE", approvedAt: now, connectedAt: now },
    }),
  ]);
  return updatedLink;
}

export type RequestAgencyResult =
  | { success: true; status: "CONNECTED"; agencyName: string }
  | { success: true; status: "PENDING"; agencyName: string }
  | { success: false; error: string };

/**
 * The direct-to-Member counterpart of createReferralLinkForApplication +
 * connectReferralOnApproval, for entry points where a Member already exists
 * — Signup (invite completion) and Profile Settings. QR_CODE/LINK sources
 * connect immediately (same automatic rule as Apply); MANUAL_ENTRY creates a
 * PENDING request and notifies the agency instead of connecting.
 */
export async function requestOrConnectAgency(
  organizationId: string,
  memberId: string,
  rawCode: string,
  source: ReferralSource
): Promise<RequestAgencyResult> {
  const validation = await validateReferralCode(organizationId, rawCode);
  if (!validation.valid) return { success: false, error: validation.reason };

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId, deletedAt: null },
    select: { id: true, referredByMemberId: true },
  });
  if (!member) return { success: false, error: "Member not found." };
  if (member.referredByMemberId) {
    return { success: false, error: "This account is already connected to an agency. Contact a Super Admin to change it." };
  }

  const existingLink = await prisma.referralLink.findUnique({ where: { memberId }, select: { status: true } });
  if (existingLink?.status === "PENDING") {
    return { success: false, error: "You already have a pending request with an agency." };
  }

  const code = rawCode.trim().toUpperCase();
  const now = new Date();

  if (source !== "MANUAL_ENTRY") {
    await prisma.$transaction([
      prisma.referralLink.create({
        data: {
          organizationId,
          referrerMemberId: validation.referrerId,
          referrerRole: validation.referrerRole,
          referralCode: code,
          source,
          status: "ACTIVE",
          memberId,
          approvedAt: now,
          connectedAt: now,
        },
      }),
      prisma.member.update({
        where: { id: memberId },
        data: { referredByMemberId: validation.referrerId, referredByCode: code },
      }),
    ]);
    return { success: true, status: "CONNECTED", agencyName: validation.referrerName };
  }

  await prisma.referralLink.create({
    data: {
      organizationId,
      referrerMemberId: validation.referrerId,
      referrerRole: validation.referrerRole,
      referralCode: code,
      source: "MANUAL_ENTRY",
      status: "PENDING",
      memberId,
    },
  });
  await notifyAgencyOfNewRequest(organizationId, validation.referrerId, memberId);

  return { success: true, status: "PENDING", agencyName: validation.referrerName };
}

export type CreatorRequestActionResult =
  | { success: true; creatorId: string; creatorName: string; agencyName: string }
  | { success: false; error: string };

/**
 * "Only the agency receiving the request may approve or reject it" is
 * enforced by the `referrerMemberId: agencyMemberId` clause in the lookup
 * itself (or by the caller passing a Super Admin override — see
 * referral-actions.ts) — there's no separate connect step for approval vs.
 * rejection to fall out of sync with.
 */
export async function approveCreatorRequest(
  organizationId: string,
  referralLinkId: string,
  agencyMemberId: string
): Promise<CreatorRequestActionResult> {
  const link = await prisma.referralLink.findFirst({
    where: { id: referralLinkId, organizationId, referrerMemberId: agencyMemberId, status: "PENDING", source: "MANUAL_ENTRY" },
    include: { referrer: { select: { fullName: true } } },
  });
  if (!link || !link.memberId) return { success: false, error: "Request not found or already reviewed." };

  const now = new Date();
  await prisma.$transaction([
    prisma.member.update({
      where: { id: link.memberId },
      data: { referredByMemberId: link.referrerMemberId, referredByCode: link.referralCode },
    }),
    prisma.referralLink.update({
      where: { id: link.id },
      data: { status: "ACTIVE", approvedAt: now, connectedAt: now },
    }),
  ]);

  const creator = await prisma.member.findUniqueOrThrow({
    where: { id: link.memberId },
    select: { id: true, fullName: true, email: true },
  });

  await notifyMembers([creator.id], {
    type: "AGENCY_REQUEST_APPROVED",
    title: "Your agency request was approved",
    body: `You're now connected to ${link.referrer.fullName}.`,
    link: "/settings#agency",
  });
  await EmailService.sendAgencyRequestApprovedEmail({
    to: creator.email,
    fullName: creator.fullName,
    agencyName: link.referrer.fullName,
    organizationId,
    memberId: creator.id,
  });

  return { success: true, creatorId: creator.id, creatorName: creator.fullName, agencyName: link.referrer.fullName };
}

/**
 * "If rejected: no agency relationship is created ... they may request a
 * different agency" — clearing `memberId` (mirroring how transferReferral
 * detaches a superseded link) is what makes that re-request possible: the
 * unique constraint on ReferralLink.memberId would otherwise block a second
 * PENDING row for the same creator forever.
 */
export async function rejectCreatorRequest(
  organizationId: string,
  referralLinkId: string,
  agencyMemberId: string,
  reviewNote?: string
): Promise<CreatorRequestActionResult> {
  const link = await prisma.referralLink.findFirst({
    where: { id: referralLinkId, organizationId, referrerMemberId: agencyMemberId, status: "PENDING", source: "MANUAL_ENTRY" },
    include: { referrer: { select: { fullName: true } } },
  });
  if (!link || !link.memberId) return { success: false, error: "Request not found or already reviewed." };

  const creatorId = link.memberId;

  await prisma.referralLink.update({
    where: { id: link.id },
    data: { status: "REJECTED", rejectedAt: new Date(), reviewNote: reviewNote?.trim() || null, memberId: null },
  });

  const creator = await prisma.member.findUniqueOrThrow({
    where: { id: creatorId },
    select: { id: true, fullName: true, email: true },
  });

  await notifyMembers([creator.id], {
    type: "AGENCY_REQUEST_REJECTED",
    title: "Your agency request was declined",
    body: `${link.referrer.fullName} declined your request. You can request a different agency any time from Settings.`,
    link: "/settings#agency",
  });
  await EmailService.sendAgencyRequestRejectedEmail({
    to: creator.email,
    fullName: creator.fullName,
    agencyName: link.referrer.fullName,
    organizationId,
    memberId: creator.id,
  });

  return { success: true, creatorId: creator.id, creatorName: creator.fullName, agencyName: link.referrer.fullName };
}

export type PendingRequestFilters = {
  search?: string;
  sort?: "newest" | "oldest" | "name";
};

export type PendingCreatorRequest = {
  referralLinkId: string;
  memberId: string;
  fullName: string;
  email: string;
  role: MemberRole;
  followerCount: number | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  requestedAt: Date;
};

/** Powers the Agency Dashboard's "Pending Creator Requests" section. */
export async function getPendingRequestsForAgency(
  organizationId: string,
  agencyMemberId: string,
  filters: PendingRequestFilters = {}
): Promise<PendingCreatorRequest[]> {
  const links = await prisma.referralLink.findMany({
    where: {
      organizationId,
      referrerMemberId: agencyMemberId,
      status: "PENDING",
      source: "MANUAL_ENTRY",
      memberId: { not: null },
      ...(filters.search
        ? {
            member: {
              OR: [
                { fullName: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      member: {
        select: { id: true, fullName: true, email: true, role: true, followerCount: true, instagramUrl: true, tiktokUrl: true, youtubeUrl: true },
      },
    },
    orderBy:
      filters.sort === "oldest"
        ? { referredAt: "asc" }
        : filters.sort === "name"
          ? { member: { fullName: "asc" } }
          : { referredAt: "desc" },
  });

  return links
    .filter((l): l is typeof l & { member: NonNullable<typeof l.member> } => l.member !== null)
    .map((l) => ({
      referralLinkId: l.id,
      memberId: l.member.id,
      fullName: l.member.fullName,
      email: l.member.email,
      role: l.member.role,
      followerCount: l.member.followerCount,
      instagramUrl: l.member.instagramUrl,
      tiktokUrl: l.member.tiktokUrl,
      youtubeUrl: l.member.youtubeUrl,
      requestedAt: l.referredAt,
    }));
}

export type AgencyRequestStats = { pending: number; approvedThisMonth: number; rejectedThisMonth: number };

/** Powers the Agency Dashboard's "Pending Requests" summary card. */
export async function getAgencyRequestStats(organizationId: string, agencyMemberId: string): Promise<AgencyRequestStats> {
  const monthStart = startOfMonth(new Date());
  const [pending, approvedThisMonth, rejectedThisMonth] = await Promise.all([
    prisma.referralLink.count({
      where: { organizationId, referrerMemberId: agencyMemberId, status: "PENDING", source: "MANUAL_ENTRY", memberId: { not: null } },
    }),
    prisma.referralLink.count({
      where: { organizationId, referrerMemberId: agencyMemberId, status: "ACTIVE", source: "MANUAL_ENTRY", approvedAt: { gte: monthStart } },
    }),
    prisma.referralLink.count({
      where: { organizationId, referrerMemberId: agencyMemberId, status: "REJECTED", rejectedAt: { gte: monthStart } },
    }),
  ]);
  return { pending, approvedThisMonth, rejectedThisMonth };
}

export type CreatorAgencyStatus =
  | { status: "NONE" }
  | { status: "PENDING"; agencyName: string }
  | { status: "CONNECTED"; agencyId: string; agencyName: string };

/** Powers the Creator Profile / Settings "No Agency" / "Pending Agency Approval" / "Connected to: X" display. */
export async function getCreatorAgencyStatus(organizationId: string, memberId: string): Promise<CreatorAgencyStatus> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId },
    select: { referredByMemberId: true, referredBy: { select: { id: true, fullName: true } } },
  });
  if (member?.referredByMemberId && member.referredBy) {
    return { status: "CONNECTED", agencyId: member.referredBy.id, agencyName: member.referredBy.fullName };
  }

  const pendingLink = await prisma.referralLink.findUnique({
    where: { memberId },
    select: { status: true, referrer: { select: { fullName: true } } },
  });
  if (pendingLink?.status === "PENDING") {
    return { status: "PENDING", agencyName: pendingLink.referrer.fullName };
  }

  return { status: "NONE" };
}

export type AgencyDashboardData = {
  agencyId: string;
  agencyName: string;
  referralCode: string | null;
  connectedCreators: {
    id: string;
    fullName: string;
    profilePhotoUrl: string | null;
    currentGMV: number;
    memberSince: Date;
    status: string;
  }[];
  pendingCreatorRequests: number;
  lifetimeGMV: number;
  monthlyGMV: number;
  topPerformingCreator: { id: string; fullName: string; currentGMV: number } | null;
};

/**
 * Everything the Agency Dashboard shows — every figure here is a live
 * aggregate over GMVTransaction/Member rows joined through
 * referredByMemberId, never a separately-maintained rollup column, so "no
 * manual intervention required" holds automatically: a new GMV entry for a
 * connected creator is reflected the moment this is queried again.
 */
export async function getAgencyDashboardData(
  organizationId: string,
  agencyMemberId: string
): Promise<AgencyDashboardData | null> {
  const agency = await prisma.member.findFirst({
    where: { id: agencyMemberId, organizationId, deletedAt: null },
    select: { id: true, fullName: true, referralCode: true, role: true },
  });
  if (!agency || !isReferralEligibleRole(agency.role)) return null;

  const monthStart = startOfMonth(new Date());

  const [connectedCreators, pendingCreatorRequests, lifetimeAgg, monthAgg] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId, referredByMemberId: agency.id, deletedAt: null },
      select: { id: true, fullName: true, profilePhotoUrl: true, currentGMV: true, memberSince: true, status: true },
      orderBy: { currentGMV: "desc" },
    }),
    prisma.referralLink.count({
      where: { organizationId, referrerMemberId: agency.id, status: "PENDING", source: "MANUAL_ENTRY", memberId: { not: null } },
    }),
    prisma.gMVTransaction.aggregate({
      where: { member: { organizationId, referredByMemberId: agency.id } },
      _sum: { amount: true },
    }),
    prisma.gMVTransaction.aggregate({
      where: { member: { organizationId, referredByMemberId: agency.id }, transactionDate: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ]);

  const top = connectedCreators[0] ?? null;

  return {
    agencyId: agency.id,
    agencyName: agency.fullName,
    referralCode: agency.referralCode,
    connectedCreators: connectedCreators.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      profilePhotoUrl: c.profilePhotoUrl,
      currentGMV: Number(c.currentGMV),
      memberSince: c.memberSince,
      status: c.status,
    })),
    pendingCreatorRequests,
    lifetimeGMV: Number(lifetimeAgg._sum.amount ?? 0),
    monthlyGMV: Number(monthAgg._sum.amount ?? 0),
    topPerformingCreator: top ? { id: top.id, fullName: top.fullName, currentGMV: Number(top.currentGMV) } : null,
  };
}

/** The full referral audit trail for one agency — "attribution even months
 * later": every row here survives independently of whether the connected
 * Member or the original application still exist. */
export async function listReferralsForAgency(organizationId: string, agencyMemberId: string) {
  return prisma.referralLink.findMany({
    where: { organizationId, referrerMemberId: agencyMemberId },
    orderBy: { referredAt: "desc" },
    include: {
      application: { select: { id: true, fullName: true, email: true } },
      member: { select: { id: true, fullName: true, currentGMV: true } },
    },
  });
}

export type TransferReferralInput = {
  organizationId: string;
  memberId: string;
  /** null disconnects the member from any agency entirely. */
  newReferralCode: string | null;
};

export type TransferReferralResult =
  | { success: true; newReferrerId: string | null }
  | { success: false; error: string };

/**
 * The only other writer of Member.referredByMemberId besides
 * connectReferralOnApproval — reassigns (or clears) an already-connected
 * member's agency. Never mutates the prior ReferralLink's history fields;
 * instead it detaches that row's `memberId` (keeping its own
 * referrer/application/timestamps intact forever) and marks it TRANSFERRED,
 * then starts a fresh ACTIVE link for the new assignment — so
 * listReferralsForAgency always reflects exactly what happened and when,
 * even across multiple transfers.
 */
export async function transferReferral(input: TransferReferralInput): Promise<TransferReferralResult> {
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, organizationId: input.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!member) return { success: false, error: "Member not found." };

  let newReferrer: { id: string; role: MemberRole } | null = null;
  let normalizedCode: string | null = null;
  if (input.newReferralCode) {
    const validation = await validateReferralCode(input.organizationId, input.newReferralCode);
    if (!validation.valid) return { success: false, error: validation.reason };
    newReferrer = { id: validation.referrerId, role: validation.referrerRole };
    normalizedCode = input.newReferralCode.trim().toUpperCase();
  }

  const existingLink = await prisma.referralLink.findUnique({ where: { memberId: input.memberId } });

  await prisma.$transaction([
    ...(existingLink
      ? [prisma.referralLink.update({ where: { id: existingLink.id }, data: { status: "TRANSFERRED", memberId: null } })]
      : []),
    ...(newReferrer
      ? [
          prisma.referralLink.create({
            data: {
              organizationId: input.organizationId,
              referrerMemberId: newReferrer.id,
              referrerRole: newReferrer.role,
              referralCode: normalizedCode!,
              source: "MANUAL_ENTRY",
              status: "ACTIVE",
              memberId: input.memberId,
              approvedAt: new Date(),
              connectedAt: new Date(),
            },
          }),
        ]
      : []),
    prisma.member.update({
      where: { id: input.memberId },
      data: { referredByMemberId: newReferrer?.id ?? null, referredByCode: normalizedCode },
    }),
  ]);

  return { success: true, newReferrerId: newReferrer?.id ?? null };
}

/** Ranks referral-eligible members by the *referred* GMV they've generated
 * (distinct from their own currentGMV, which leaderboardByRole in
 * gmv.service.ts already covers) — "Agency Leaderboards". Generic over any
 * referral-eligible role for the same future-expansion reason as everywhere
 * else in this module. */
export async function getReferralLeaderboard(organizationId: string, role: MemberRole, take = 10) {
  const referrers = await prisma.member.findMany({
    where: { organizationId, role, deletedAt: null, referralCode: { not: null } },
    select: {
      id: true,
      fullName: true,
      profilePhotoUrl: true,
      referralCode: true,
      referredMembers: { where: { deletedAt: null }, select: { id: true, currentGMV: true } },
    },
  });

  return referrers
    .map((r) => ({
      id: r.id,
      name: r.fullName,
      photoUrl: r.profilePhotoUrl,
      referralCode: r.referralCode,
      creatorCount: r.referredMembers.length,
      gmv: r.referredMembers.reduce((sum, m) => sum + Number(m.currentGMV), 0),
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, take);
}
