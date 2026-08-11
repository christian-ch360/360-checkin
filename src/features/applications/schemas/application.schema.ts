import { z } from "zod";
import { PUBLIC_APPLICANT_ROLE_VALUES } from "@/features/members/role-labels";

export const agencyMemberRoleValues = ["OWNER", "MANAGER", "STAFF"] as const;

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  // Public submission (apply page + kiosk) — STAFF is deliberately excluded;
  // it can only be assigned by an admin from the Admin Dashboard.
  role: z.enum(PUBLIC_APPLICANT_ROLE_VALUES),
  company: z.string().trim().optional().or(z.literal("")),
  // "Agency Uniqueness" — only meaningful for referral-eligible roles (Agency
  // today); checked server-side against every other referral-eligible
  // member's business name/website/registration number before the
  // application is even created. See checkAgencyDuplicate.
  website: z.string().trim().optional().or(z.literal("")),
  businessRegistrationNumber: z.string().trim().optional().or(z.literal("")),
  // "Existing Agency Claim Workflow" — set when the applicant chose "Request
  // Access to Existing Agency" after a duplicate was detected, instead of
  // registering a new one. Re-validated server-side in submitApplication.
  claimAgencyId: z.string().trim().optional().or(z.literal("")),
  claimAgencyRole: z.enum(agencyMemberRoleValues).optional(),
  // "Creator Request Notes" — the applicant's own answer to "Why are you
  // requesting to join this agency?", shown to the agency's reviewers
  // alongside the request at approval time.
  claimRequestNote: z.string().trim().max(1000, "Keep your note under 1000 characters").optional().or(z.literal("")),
  // "Agency Invitations" — set when this application was reached via an
  // Owner/Manager's team invitation link. Re-validated server-side; the
  // invitation IS the approval, so this bypasses both Agency Uniqueness
  // duplicate checks and the pending AgencyAccessRequest step entirely.
  agencyInviteToken: z.string().trim().optional().or(z.literal("")),
  instagram: z.string().trim().min(1, "Instagram is required"),
  tiktok: z.string().trim().min(1, "TikTok is required"),
  youtube: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  country: z.string().trim().optional().or(z.literal("")),
  referredBy: z.string().trim().min(1, "Let us know who referred you, or choose \"No Referral\""),
  // Structured affiliate tracking — distinct from the freeform referredBy
  // text above. Optional: most applicants have no referral code at all.
  // Re-validated server-side in submitApplication regardless of this value.
  referralCode: z.string().trim().optional().or(z.literal("")),
  referralSource: z.enum(["QR_CODE", "LINK", "MANUAL_ENTRY"]).optional(),
  termsAccepted: z.literal(true, { message: "You must accept the Terms & Conditions to apply" }),
  privacyAccepted: z.literal(true, { message: "You must accept the Privacy Policy to apply" }),
  mediaReleaseAccepted: z.literal(true, {
    message: "You must accept the Media Release and Release of Liability to apply",
  }),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
