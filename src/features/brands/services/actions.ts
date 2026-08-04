"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";

const brandSchema = z.object({
  name: z.string().min(2, "Enter a brand name"),
  companyId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});

export type CreateBrandInput = z.infer<typeof brandSchema>;
export type BrandActionResult = { success: true } | { success: false; error: string };

export async function createBrand(input: CreateBrandInput): Promise<BrandActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to add brands." };
  }

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const brand = await prisma.brand.create({
    data: {
      organizationId: actor.organizationId,
      name: parsed.data.name,
      companyId: parsed.data.companyId || null,
      description: parsed.data.description || null,
    },
  });

  await ensureQRAsset({ type: "BRAND", brandId: brand.id });
  revalidatePath("/brands");
  return { success: true };
}
