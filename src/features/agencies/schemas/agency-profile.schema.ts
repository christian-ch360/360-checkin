import { z } from "zod";
import { parseInstagramInput, parseTiktokInput, parseYoutubeInput, parseLinkedinInput } from "@/lib/utils/social-links";

/** "Agency Settings" — the fields an Owner/Manager can edit for their agency's public profile.
 * Agency ID, QR code, and referral link are read-only and rendered separately (AgencyReferralCard). */
export const agencyProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter an agency name"),
  website: z.string().trim().optional().or(z.literal("")),
  bio: z.string().trim().max(1000, "Keep your description under 1000 characters").optional().or(z.literal("")),
  location: z.string().trim().max(120, "Keep this under 120 characters").optional().or(z.literal("")),
  businessRegistrationNumber: z.string().trim().optional().or(z.literal("")),
  agencyCategories: z.array(z.string().trim().min(1)).max(10, "Up to 10 categories"),
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
    .refine((v) => !v || parseYoutubeInput(v) !== null, "Enter a valid YouTube handle or URL"),
  linkedinUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || parseLinkedinInput(v) !== null, "Enter a valid LinkedIn username or URL"),
});

export type AgencyProfileInput = z.infer<typeof agencyProfileSchema>;
