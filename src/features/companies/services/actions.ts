"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";

const companySchema = z.object({
  name: z.string().min(2, "Enter a company name"),
  website: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type CreateCompanyInput = z.infer<typeof companySchema>;
export type CompanyActionResult = { success: true } | { success: false; error: string };

export async function createCompany(input: CreateCompanyInput): Promise<CompanyActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to add companies." };
  }

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.company.create({
    data: {
      organizationId: actor.organizationId,
      name: parsed.data.name,
      website: parsed.data.website || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/companies");
  return { success: true };
}
