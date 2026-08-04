import { z } from "zod";

export const membershipFeatureSchema = z.object({
  key: z
    .string()
    .min(2, "Enter a key")
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores only"),
  label: z.string().min(2, "Enter a label"),
  description: z.string().optional().or(z.literal("")),
  valueType: z.enum(["BOOLEAN", "NUMBER", "TEXT"]),
  resetPeriod: z.enum(["NONE", "DAILY", "MONTHLY"]),
});

export type MembershipFeatureInput = z.infer<typeof membershipFeatureSchema>;
