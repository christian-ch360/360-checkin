import "server-only";

import type { MemberRole, MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { notifyMembers } from "@/lib/notifications";
import { REFERRAL_ELIGIBLE_ROLES } from "@/features/referrals/config/referral-config";
import { transferReferral } from "@/features/referrals/services/referral.service";

/** Statuses an existing agency record must be in to count as a live duplicate — a REJECTED
 * application never went anywhere, so it shouldn't block someone from trying again. */
const DUPLICATE_BLOCKING_STATUSES: MemberStatus[] = ["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"];

/** "This agency already exists in CreatorHub360." — thrown by the write paths (submitApplication,
 * createMemberFromSignup) that don't already return a structured `{success,error}` result, so the
 * caller can catch it distinctly from an unexpected failure and surface the exact message. */
export class AgencyDuplicateError extends Error {
  existingAgencyId: string;
  existingAgencyName: string;
  constructor(message: string, existingAgencyId: string, existingAgencyName: string) {
    super(message);
    this.name = "AgencyDuplicateError";
    this.existingAgencyId = existingAgencyId;
    this.existingAgencyName = existingAgencyName;
  }
}

/** Strips protocol, "www.", path/query/hash, and a trailing dot/slash — so "https://www.novatalent.com/contact"
 * and "novatalent.com" compare equal. Returns null for empty/unparseable input rather than throwing. */
export function normalizeWebsiteDomain(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  let v = value.trim().toLowerCase().replace(/^https?:\/\//, "");
  v = v.replace(/^www\./, "");
  v = v.split(/[/?#]/)[0] ?? "";
  v = v.replace(/\.$/, "");
  return v || null;
}

function normalizeName(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase().replace(/\s+/g, " ");
  return trimmed || null;
}

function normalizeRegistration(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toUpperCase().replace(/\s+/g, "");
  return trimmed || null;
}

export type AgencyDuplicateCandidate = {
  businessName: string;
  website?: string | null;
  businessRegistrationNumber?: string | null;
};

export type AgencyDuplicateMatch = {
  field: "name" | "website" | "registration";
  existingAgency: { id: string; fullName: string; referralCode: string | null; status: MemberStatus };
};

export type AgencyDuplicateResult = { duplicate: false } | { duplicate: true; matches: AgencyDuplicateMatch[] };

/**
 * "Every agency must have exactly one unique Agency ID ... may only exist once" — this is what
 * makes that true at the point of creation, before an Agency ID even exists to compare (referralCode
 * is minted on approval, and its DB @unique constraint already makes literal ID collisions
 * impossible by construction). Checked against business name, website domain, and business
 * registration number of every other non-deleted referral-eligible member in a blocking status.
 * Generic over REFERRAL_ELIGIBLE_ROLES rather than hardcoded to "AGENCY" for the same
 * future-expansion reason as the rest of the referral system — Brand/Broker/Business Development
 * IDs will get the same protection with zero changes here.
 */
export async function checkAgencyDuplicate(
  organizationId: string,
  role: MemberRole,
  candidate: AgencyDuplicateCandidate,
  excludeMemberId?: string
): Promise<AgencyDuplicateResult> {
  if (!REFERRAL_ELIGIBLE_ROLES.includes(role)) return { duplicate: false };

  const name = normalizeName(candidate.businessName);
  const domain = normalizeWebsiteDomain(candidate.website);
  const registration = normalizeRegistration(candidate.businessRegistrationNumber);

  const existing = await prisma.member.findMany({
    where: {
      organizationId,
      role,
      deletedAt: null,
      status: { in: DUPLICATE_BLOCKING_STATUSES },
      // A team member who joined an *existing* agency (see the Existing
      // Agency Claim Workflow) is not itself a distinct agency record — only
      // canonical/root identities compete for uniqueness here.
      agencyId: null,
      ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
    },
    select: { id: true, fullName: true, website: true, businessRegistrationNumber: true, referralCode: true, status: true },
  });

  const matches: AgencyDuplicateMatch[] = [];
  for (const agency of existing) {
    const existingAgency = { id: agency.id, fullName: agency.fullName, referralCode: agency.referralCode, status: agency.status };
    if (name && normalizeName(agency.fullName) === name) matches.push({ field: "name", existingAgency });
    if (domain && normalizeWebsiteDomain(agency.website) === domain) matches.push({ field: "website", existingAgency });
    if (registration && normalizeRegistration(agency.businessRegistrationNumber) === registration) {
      matches.push({ field: "registration", existingAgency });
    }
  }

  return matches.length > 0 ? { duplicate: true, matches } : { duplicate: false };
}

export type MergeAgenciesResult = { success: true } | { success: false; error: string };

/**
 * "Only Super Admins may merge duplicate agencies if one is accidentally created" — permission
 * check is the caller's job (agencies.merge, see referral-actions.ts's mergeAgenciesAction).
 * Reassigns everything the duplicate's referral identity touches onto the primary — every
 * ReferralLink it ever referred, and every creator currently connected to it (reusing
 * transferReferral so each of those creators gets the exact same audit-logged, history-preserving
 * reassignment a manual Super Admin transfer would produce) — then soft-deletes the duplicate.
 * Its Agency ID dies with it: every read path in this codebase already filters `deletedAt: null`,
 * so the retired code simply stops resolving instead of needing to be explicitly released.
 */
export async function mergeAgencies(
  organizationId: string,
  primaryAgencyId: string,
  duplicateAgencyId: string,
  actorId: string
): Promise<MergeAgenciesResult> {
  if (primaryAgencyId === duplicateAgencyId) {
    return { success: false, error: "Cannot merge an agency into itself." };
  }

  const [primary, duplicate] = await Promise.all([
    prisma.member.findFirst({ where: { id: primaryAgencyId, organizationId, deletedAt: null }, select: { id: true, role: true, fullName: true } }),
    prisma.member.findFirst({ where: { id: duplicateAgencyId, organizationId, deletedAt: null }, select: { id: true, role: true, fullName: true, referralCode: true } }),
  ]);
  if (!primary) return { success: false, error: "Primary agency not found." };
  if (!duplicate) return { success: false, error: "Duplicate agency not found." };
  if (!REFERRAL_ELIGIBLE_ROLES.includes(primary.role) || primary.role !== duplicate.role) {
    return { success: false, error: "Both records must be the same referral-eligible role (e.g. Agency)." };
  }

  const primaryCode = await prisma.member.findUniqueOrThrow({ where: { id: primaryAgencyId }, select: { referralCode: true } });
  if (!primaryCode.referralCode) return { success: false, error: "The primary agency has no Agency ID yet." };

  const connectedCreators = await prisma.member.findMany({
    where: { organizationId, referredByMemberId: duplicateAgencyId, deletedAt: null },
    select: { id: true },
  });

  for (const creator of connectedCreators) {
    const result = await transferReferral({ organizationId, memberId: creator.id, newReferralCode: primaryCode.referralCode });
    if (!result.success) return { success: false, error: `Failed to reassign a connected creator: ${result.error}` };
  }

  // Any still-open agency-approval requests referencing the duplicate as referrer move over too,
  // so nothing orphaned survives the merge. Scoped to PENDING only — ACTIVE/TRANSFERRED/REJECTED
  // rows are historical record and must stay exactly as transferReferral (used above) leaves them.
  await prisma.referralLink.updateMany({
    where: { organizationId, referrerMemberId: duplicateAgencyId, status: "PENDING" },
    data: { referrerMemberId: primaryAgencyId, referrerRole: primary.role },
  });

  await prisma.member.update({ where: { id: duplicateAgencyId }, data: { deletedAt: new Date() } });

  await logAudit({
    organizationId,
    actorId,
    action: "agency.merged",
    entityType: "member",
    entityId: primaryAgencyId,
    before: { duplicateAgencyId, duplicateName: duplicate.fullName, duplicateReferralCode: duplicate.referralCode },
    after: { mergedInto: primaryAgencyId, primaryName: primary.fullName, connectedCreatorsMoved: connectedCreators.length },
  });

  await notifyMembers([primaryAgencyId], {
    type: "SYSTEM",
    title: `${duplicate.fullName} was merged into your agency`,
    body: connectedCreators.length > 0 ? `${connectedCreators.length} connected creator(s) were reassigned to you.` : undefined,
    link: "/agency",
  });

  return { success: true };
}
