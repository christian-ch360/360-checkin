import { z } from "zod";
import { APPLICANT_ROLE_VALUES } from "@/features/members/role-labels";
import { parseInstagramInput, parseTiktokInput, parseYoutubeInput, parseLinkedinInput } from "@/lib/utils/social-links";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// The applicant-selectable roles — single source of truth is
// features/members/role-labels.ts's APPLICANT_ROLE_VALUES.
export const appliedRoleValues = APPLICANT_ROLE_VALUES;

export const signupSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    phone: z.string().optional().or(z.literal("")),
    companyName: z.string().optional().or(z.literal("")),
    appliedRole: z.enum(appliedRoleValues),
    bio: z.string().optional().or(z.literal("")),
    instagramUrl: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || parseInstagramInput(v) !== null, "Enter a valid Instagram username or URL"),
    tiktokUrl: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || parseTiktokInput(v) !== null, "Enter a valid TikTok username or URL"),
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
      .refine((v) => !v || parseLinkedinInput(v) !== null, "Enter a valid LinkedIn username or URL"),
    followerCount: z.string().optional().or(z.literal("")),
    platforms: z.string().optional().or(z.literal("")),
    agencyCode: z.string().optional().or(z.literal("")),
    // "Agency Uniqueness" — only meaningful when appliedRole is AGENCY;
    // checked server-side against every other agency's business
    // name/website/registration number before the Member is created.
    website: z.string().trim().optional().or(z.literal("")),
    businessRegistrationNumber: z.string().trim().optional().or(z.literal("")),
    // "Existing Agency Claim Workflow" — set when the applicant chose
    // "Request Access to Existing Agency" after a duplicate was detected.
    claimAgencyId: z.string().trim().optional().or(z.literal("")),
    claimAgencyRole: z.enum(["OWNER", "MANAGER", "STAFF"]).optional(),
    // "Creator Request Notes" — the applicant's own answer to "Why are you
    // requesting to join this agency?", shown to the agency's reviewers.
    claimRequestNote: z.string().trim().max(1000, "Keep your note under 1000 characters").optional().or(z.literal("")),
    inviteToken: z.string().optional().or(z.literal("")),
    termsAccepted: z.literal(true, { message: "You must accept the Terms & Conditions to continue" }),
    privacyAccepted: z.literal(true, { message: "You must accept the Privacy Policy to continue" }),
    dataProcessingAccepted: z.literal(true, {
      message: "You must consent to the collection and processing of your personal data to continue",
    }),
    mediaReleaseAccepted: z.literal(true, {
      message: "You must accept the Media Release and Release of Liability to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
