import { z } from "zod";

export const revenueGoalSchema = z.object({
  annualGoal: z.string().min(1, "Enter a goal amount"),
});

export type RevenueGoalInput = z.infer<typeof revenueGoalSchema>;
