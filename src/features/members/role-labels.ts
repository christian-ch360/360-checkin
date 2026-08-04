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
// through onboarding. Single source of truth for every applicant-facing
// role picker (apply form, kiosk apply form, invite completion, pending
// member approval) — do not fork another copy of this list.
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
