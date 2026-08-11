import type { MemberRole } from "@prisma/client";

export const ROLE_LABELS: Record<MemberRole, string> = {
  BRAND: "Brand",
  AGENCY: "Agency",
  BROKER: "Broker",
  BUSINESS_DEVELOPMENT: "Business Development",
  CREATOR: "Creator",
  PROJECT_LEADER: "Project Leader",
  VENDOR: "Vendor",
  STAFF: "Staff",
  ENTERTAINMENT: "Entertainment",
  INVESTOR: "Investor",
};

// The 8 roles assignable on the application / invite / approval workflow —
// a subset of MemberRole that excludes the two internal-only values
// (PROJECT_LEADER, VENDOR) nobody self-selects and admins don't assign
// through onboarding. Single source of truth for every ADMIN-facing role
// picker that reassigns an applicant's role (pending-member approval drawer,
// applications/pending-members filters) — STAFF is intentionally included
// here since admins must still be able to assign it during review. Public
// forms must use PUBLIC_APPLICANT_ROLE_VALUES below instead, not this one.
export const APPLICANT_ROLE_VALUES = [
  "CREATOR",
  "BRAND",
  "AGENCY",
  "BROKER",
  "BUSINESS_DEVELOPMENT",
  "ENTERTAINMENT",
  "INVESTOR",
  "STAFF",
] as const satisfies readonly MemberRole[];

// Roles a member of the public can self-select — same list as above minus
// STAFF. Staff accounts must only ever be created by an Administrator or
// Super Admin from the Admin Dashboard (MemberForm / memberRoleValues in
// member.schema.ts), never through public registration. Every public-facing
// role picker AND every zod schema that validates a public submission
// (apply form, kiosk apply form, invited self-service signup) must import
// this constant — not APPLICANT_ROLE_VALUES — so the server-side parse
// itself rejects a tampered "role=STAFF" request, not just the UI.
export const PUBLIC_APPLICANT_ROLE_VALUES = APPLICANT_ROLE_VALUES.filter(
  (role) => role !== "STAFF"
) as Exclude<(typeof APPLICANT_ROLE_VALUES)[number], "STAFF">[];
