import { z } from "zod";

export const applicationStatusValues = ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const;

export const applicationSchema = z.object({
  message: z.string().optional().or(z.literal("")),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
