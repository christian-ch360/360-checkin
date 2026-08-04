import type { MemberRole } from "@prisma/client";

/**
 * Single source of truth for "which MemberRoles get an auto-generated
 * referral code." Today only AGENCY does — extending affiliate tracking to
 * Brand/Broker/Business Development/Staff referral IDs is just adding their
 * role here and a prefix below, since ReferralLink.referrerRole and every
 * query in referral.service.ts are already written generically against
 * REFERRAL_ELIGIBLE_ROLES rather than hardcoding "AGENCY". No schema or
 * migration changes are needed for that future expansion.
 */
export const REFERRAL_ELIGIBLE_ROLES: MemberRole[] = ["AGENCY"];

/** e.g. "AGY-001284". Keyed by MemberRole so the generator/validator stay generic. */
export const REFERRAL_CODE_PREFIX: Partial<Record<MemberRole, string>> = {
  AGENCY: "AGY",
  // BRAND: "BRD",
  // BROKER: "BRK",
  // BUSINESS_DEVELOPMENT: "BDV",
  // STAFF: "STF",
};

export function isReferralEligibleRole(role: MemberRole): boolean {
  return REFERRAL_ELIGIBLE_ROLES.includes(role);
}

export function referralCodePrefixFor(role: MemberRole): string | null {
  return REFERRAL_CODE_PREFIX[role] ?? null;
}
