import { z } from "zod";

export const collabPostCategoryValues = [
  "CREATOR",
  "BRAND",
  "AGENCY",
  "PHOTOGRAPHER",
  "VIDEOGRAPHER",
  "EDITOR",
  "MODEL",
  "PODCAST",
  "UGC",
] as const;

export const collabBudgetTypeValues = ["PAID", "TRADE", "FREE"] as const;
export const collabLocationValues = ["ON_SITE", "REMOTE"] as const;
export const collabPostStatusValues = ["OPEN", "CLOSED", "FILLED"] as const;

export const collabPostSchema = z.object({
  title: z.string().min(3, "Give it a short title"),
  description: z.string().min(10, "Describe what you're looking for"),
  category: z.enum(collabPostCategoryValues),
  budgetType: z.enum(collabBudgetTypeValues),
  budgetNote: z.string().optional().or(z.literal("")),
  dateNeeded: z.string().optional().or(z.literal("")),
  location: z.enum(collabLocationValues),
  expiresAt: z.string().optional().or(z.literal("")),
  imageUrls: z.array(z.string().url()).optional(),
  videoUrls: z.array(z.string().url()).optional(),
});

export type CollabPostInput = z.infer<typeof collabPostSchema>;
