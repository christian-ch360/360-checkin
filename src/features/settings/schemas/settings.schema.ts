import { z } from "zod";
import { contentCategoryValues } from "@/features/members/constants/content-categories";
import { parseInstagramInput, parseTiktokInput, parseYoutubeInput, parseLinkedinInput } from "@/lib/utils/social-links";

export const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  username: z
    .string()
    .regex(/^[a-z0-9_.]{3,30}$/i, "3-30 letters, numbers, periods, or underscores")
    .optional()
    .or(z.literal("")),
  displayName: z.string().max(50, "Keep this under 50 characters").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  location: z.string().max(80, "Keep this under 80 characters").optional().or(z.literal("")),
  bio: z.string().max(280, "Keep your bio under 280 characters").optional().or(z.literal("")),
  profilePhotoUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  bannerImageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const collabProfileSchema = z.object({
  skills: z.string().optional().or(z.literal("")),
  contentCategories: z.array(z.enum(contentCategoryValues)),
  lookingFor: z.string().max(280, "Keep this under 280 characters").optional().or(z.literal("")),
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
  availableForCollab: z.boolean(),
  visibleInDirectory: z.boolean(),
});

export type CollabProfileInput = z.infer<typeof collabProfileSchema>;

/**
 * The Settings "Profile" tab's single combined form — personal info +
 * Collab Hub preferences in one save, per the redesigned Settings page
 * (each tab gets exactly one Save button). `username`/`displayName`/
 * `bannerImageUrl` aren't rendered as visible fields here (that richer
 * identity editing stays on /profile) but still round-trip through this
 * schema so saving Settings doesn't null them out.
 */
export const settingsProfileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  location: z.string().max(80, "Keep this under 80 characters").optional().or(z.literal("")),
  bio: z.string().max(280, "Keep your bio under 280 characters").optional().or(z.literal("")),
  profilePhotoUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  skills: z.string().optional().or(z.literal("")),
  contentCategories: z.array(z.enum(contentCategoryValues)),
  lookingFor: z.string().max(280, "Keep this under 280 characters").optional().or(z.literal("")),
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
  availableForCollab: z.boolean(),
  visibleInDirectory: z.boolean(),
  // Round-trip only — see doc comment above.
  username: z
    .string()
    .regex(/^[a-z0-9_.]{3,30}$/i, "3-30 letters, numbers, periods, or underscores")
    .optional()
    .or(z.literal("")),
  displayName: z.string().max(50, "Keep this under 50 characters").optional().or(z.literal("")),
  bannerImageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export type SettingsProfileInput = z.infer<typeof settingsProfileSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const emailChangeSchema = z.object({
  newEmail: z.string().email("Enter a valid email address"),
  confirmPassword: z.string().min(1, "Enter your password to confirm"),
});

export type EmailChangeInput = z.infer<typeof emailChangeSchema>;

export const notificationPrefsSchema = z.object({
  notifyEmail: z.boolean(),
  notifyCollabRequests: z.boolean(),
  notifyProjectInvites: z.boolean(),
  notifySpaceBookings: z.boolean(),
  notifyVisitorArrivals: z.boolean(),
  notifyWeeklySummary: z.boolean(),
  notifyProductUpdates: z.boolean(),
});

export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
