import type { MemberRole } from "@prisma/client";

/**
 * Single source of truth for "which MemberRoles get an auto-generated
 * referral code." Every standard member role is eligible — "every eligible
 * member can have a unique referral code" — since ReferralLink.referrerRole
 * and every query in referral.service.ts are already written generically
 * against REFERRAL_ELIGIBLE_ROLES rather than hardcoding a single role. No
 * schema or migration changes were needed to broaden this list.
 */
export const REFERRAL_ELIGIBLE_ROLES: MemberRole[] = [
  "BRAND",
  "AGENCY",
  "BROKER",
  "BUSINESS_DEVELOPMENT",
  "CREATOR",
  "PROJECT_LEADER",
  "VENDOR",
  "STAFF",
  "ENTERTAINMENT",
  "INVESTOR",
];

/** e.g. "AGY-001284". Keyed by MemberRole so the generator/validator stay generic. */
export const REFERRAL_CODE_PREFIX: Partial<Record<MemberRole, string>> = {
  BRAND: "BRD",
  AGENCY: "AGY",
  BROKER: "BRK",
  BUSINESS_DEVELOPMENT: "BDV",
  CREATOR: "CRT",
  PROJECT_LEADER: "PRL",
  VENDOR: "VND",
  STAFF: "STF",
  ENTERTAINMENT: "ENT",
  INVESTOR: "INV",
};

export function isReferralEligibleRole(role: MemberRole): boolean {
  return REFERRAL_ELIGIBLE_ROLES.includes(role);
}

export function referralCodePrefixFor(role: MemberRole): string | null {
  return REFERRAL_CODE_PREFIX[role] ?? null;
}
