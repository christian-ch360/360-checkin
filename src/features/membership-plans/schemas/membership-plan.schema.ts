import { z } from "zod";

export const membershipPlanSchema = z.object({
  name: z.string().min(2, "Enter a plan name"),
  description: z.string().optional().or(z.literal("")),
  priceDollars: z.string().min(1, "Enter a price"),
  trialMonths: z.string().optional().or(z.literal("")),
  benefits: z.string().optional().or(z.literal("")), // one per line, split on save
  isActive: z.boolean(),
});

export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;
