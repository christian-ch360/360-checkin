import { z } from "zod";
import { contentCategoryValues } from "@/features/members/constants/content-categories";

const followerCount = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "string" ? value.trim() : value))
  .transform((value) => (value === "" || value == null ? null : Number(value)))
  .refine((value) => value === null || (Number.isFinite(value) && value >= 0 && value <= 5_000_000_000), {
    message: "Enter a whole number between 0 and 5,000,000,000.",
  })
  .transform((value) => (value === null ? null : Math.round(value)));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const optionalUrl = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => {
    const v = (value ?? "").trim();
    if (!v) return null;
    const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      return new URL(withProtocol).toString().replace(/\/$/, "");
    } catch {
      return null;
    }
  });

export const libraryProfileSchema = z.object({
  visible: z.boolean(),
  featured: z.boolean(),
  displayOrder: z
    .union([z.number(), z.string()])
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .transform((value) => (value === "" || value == null ? null : Number(value)))
    .refine((value) => value === null || (Number.isInteger(value) && value >= 0 && value <= 9999), {
      message: "Display order must be a whole number between 0 and 9999.",
    })
    .transform((value) => (value === null ? null : value)),
  headline: optionalText(160),
  libraryBio: optionalText(2000),
  categories: z.array(z.enum(contentCategoryValues)).max(20),
  imageUrl: optionalUrl,

  // Standalone identity + overrides.
  name: optionalText(160),
  email: optionalText(160),
  phone: optionalText(40),
  usernameHandle: optionalText(80),
  companyName: optionalText(160),
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  websiteUrl: optionalUrl,

  // Structured geography.
  country: optionalText(80),
  state: optionalText(80),
  city: optionalText(120),

  instagramFollowers: followerCount,
  tiktokFollowers: followerCount,
  youtubeSubscribers: followerCount,
});

/** Pre-parse shape callers pass in (numbers arrive as strings from form inputs). */
export type LibraryProfileInput = z.input<typeof libraryProfileSchema>;
/** Post-parse shape used when writing to the database. */
export type LibraryProfileParsed = z.output<typeof libraryProfileSchema>;

// --- bulk organization (spec §12) ---

export const bulkAssignCategoriesSchema = z.object({
  profileIds: z.array(z.string().uuid()).min(1).max(500),
  categories: z.array(z.enum(contentCategoryValues)).min(1).max(20),
  mode: z.enum(["merge", "replace"]),
});

export const bulkAssignLocationSchema = z.object({
  profileIds: z.array(z.string().uuid()).min(1).max(500),
  country: optionalText(80),
  state: optionalText(80),
  city: optionalText(120),
});

export const bulkVisibilitySchema = z.object({
  profileIds: z.array(z.string().uuid()).min(1).max(500),
  visible: z.boolean(),
});

export const bulkFeaturedSchema = z.object({
  profileIds: z.array(z.string().uuid()).min(1).max(200),
  featured: z.boolean(),
});
