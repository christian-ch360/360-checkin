"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { uploadAgencyFile } from "@/lib/supabase/storage";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canManageFiles } from "@/features/agencies/config/agency-permissions";
import type { FolderVisibility } from "@prisma/client";

export type AgencyFileActionResult = { success: true; id?: string } | { success: false; error: string };

async function requireFileManager() {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  if (!canManageFiles(actor.agencyRole)) {
    return { actor, agencyId, allowed: false as const, error: "You don't have permission to manage files." };
  }
  return { actor, agencyId, allowed: true as const };
}

const folderSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  parentFolderId: z.string().uuid().nullable().optional(),
  visibility: z.enum(["AGENCY_ONLY", "SHARED_WITH_CREATORS", "SHARED_WITH_BRAND"]).default("AGENCY_ONLY"),
});

export async function createFolder(input: z.infer<typeof folderSchema>): Promise<AgencyFileActionResult> {
  const check = await requireFileManager();
  if (!check.allowed) return { success: false, error: check.error };

  const parsed = folderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const folder = await prisma.folder.create({
    data: {
      organizationId: check.actor.organizationId,
      agencyId: check.agencyId,
      name: parsed.data.name,
      parentFolderId: parsed.data.parentFolderId || null,
      visibility: parsed.data.visibility as FolderVisibility,
      createdById: check.actor.id,
    },
  });

  revalidatePath("/agency/files");
  return { success: true, id: folder.id };
}

export async function deleteFolder(folderId: string): Promise<AgencyFileActionResult> {
  const check = await requireFileManager();
  if (!check.allowed) return { success: false, error: check.error };

  const folder = await prisma.folder.findFirst({ where: { id: folderId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!folder) return { success: false, error: "Folder not found." };

  await prisma.folder.delete({ where: { id: folderId } });
  revalidatePath("/agency/files");
  return { success: true };
}

export async function uploadFileToFolder(folderId: string | null, formData: FormData): Promise<AgencyFileActionResult> {
  const check = await requireFileManager();
  if (!check.allowed) return { success: false, error: check.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choose a file to upload." };

  const path = `${check.actor.organizationId}/${check.agencyId}/files/${crypto.randomUUID()}-${file.name}`;
  const url = await uploadAgencyFile(path, file);

  const created = await prisma.file.create({
    data: {
      organizationId: check.actor.organizationId,
      agencyId: check.agencyId,
      folderId,
      uploadedById: check.actor.id,
      name: file.name,
      url,
      mimeType: file.type || null,
      sizeBytes: file.size,
    },
  });

  revalidatePath("/agency/files");
  return { success: true, id: created.id };
}

export async function deleteAgencyFile(fileId: string): Promise<AgencyFileActionResult> {
  const check = await requireFileManager();
  if (!check.allowed) return { success: false, error: check.error };

  const file = await prisma.file.findFirst({ where: { id: fileId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!file) return { success: false, error: "File not found." };

  await prisma.file.delete({ where: { id: fileId } });
  revalidatePath("/agency/files");
  return { success: true };
}
