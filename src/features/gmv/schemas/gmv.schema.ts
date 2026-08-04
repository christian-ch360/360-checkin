import { z } from "zod";
import { RevenueChannel } from "@prisma/client";

export const gmvEntrySchema = z.object({
  memberId: z.string().uuid("Select a member"),
  amount: z.string().min(1, "Enter an amount"),
  channel: z.nativeEnum(RevenueChannel),
  projectId: z.string().uuid().optional().or(z.literal("")),
  companyId: z.string().uuid().optional().or(z.literal("")),
  brandId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  transactionDate: z.string().optional().or(z.literal("")),
});

export type GMVEntryInput = z.infer<typeof gmvEntrySchema>;
