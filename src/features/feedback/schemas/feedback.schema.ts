import { z } from "zod";

export const feedbackCategoryValues = ["PLATFORM", "FACILITY", "OTHER"] as const;
export const feedbackStatusValues = ["OPEN", "IN_REVIEW", "RESOLVED"] as const;

export const feedbackSchema = z.object({
  category: z.enum(feedbackCategoryValues),
  subject: z.string().min(3, "Give it a short subject"),
  body: z.string().min(10, "Say a bit more so we can act on it"),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
