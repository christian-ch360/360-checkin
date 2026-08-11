import { z } from "zod";
import { parseInstagramInput, parseTiktokInput, parseYoutubeInput, parseLinkedinInput, isNoAccountValue } from "@/lib/utils/social-links";

export const memberRoleValues = [
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
] as const;

// Not real MemberRole values — these are SystemRole values that the Add
// Member form's Role dropdown also offers, Super-Admin-only, so a Super
// Admin can create a staff account with elevated system permissions in one
// step. Selecting one of these sets Member.systemRole (and defaults
// Member.role to "STAFF"); createMember enforces the Super-Admin check
// server-side regardless of what the client sends. See member-rules.ts's
// RESTRICTED_INVITE_ROLES for the equivalent restriction on the invite flow.
export const adminAssignableRoleValues = ["ADMIN", "SUPER_ADMIN"] as const;

export const memberStatusValues = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "PENDING",
  "REJECTED",
] as const;

export const memberSchema = z.object({
  fullName: z.string().min(2, "Enter a full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().optional().or(z.literal("")),
  role: z.enum([...memberRoleValues, ...adminAssignableRoleValues]),
  status: z.enum(memberStatusValues),
  companyId: z.string().uuid().optional().or(z.literal("")),
  commissionTierId: z.string().uuid().optional().or(z.literal("")),
  referralSource: z.string().optional().or(z.literal("")),
  instagramUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isNoAccountValue(v) || parseInstagramInput(v) !== null, "Enter a valid Instagram username or URL"),
  tiktokUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isNoAccountValue(v) || parseTiktokInput(v) !== null, "Enter a valid TikTok username or URL"),
  youtubeUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || parseYoutubeInput(v) !== null, "Enter a valid YouTube URL"),
  linkedinUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isNoAccountValue(v) || parseLinkedinInput(v) !== null, "Enter a valid LinkedIn username or URL"),
  // "Agency Uniqueness" — only meaningful for referral-eligible roles
  // (Agency today); checked server-side before creation. See
  // checkAgencyDuplicate.
  website: z.string().trim().optional().or(z.literal("")),
  businessRegistrationNumber: z.string().trim().optional().or(z.literal("")),
});

export type MemberInput = z.infer<typeof memberSchema>;
