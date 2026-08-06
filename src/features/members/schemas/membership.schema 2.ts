import { z } from "zod";

export const recordMembershipPaymentSchema = z.object({
  subscriptionId: z.string().uuid(),
  amountDollars: z.string().min(1, "Enter an amount"),
  note: z.string().optional().or(z.literal("")),
});

export type RecordMembershipPaymentInput = z.infer<typeof recordMembershipPaymentSchema>;
