"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { logAudit } from "@/lib/db/audit-log";
import { logAgencyActivity } from "@/features/agencies/services/agency-activity.service";
import { uploadAgencyFile } from "@/lib/supabase/storage";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canDeleteContract, canManageContracts } from "@/features/agencies/config/agency-permissions";
import { sendContractForSignature as sendForSignature, refreshContractEnvelopeStatus } from "@/features/agencies/services/docusign-actions";
import type { ContractStatus } from "@prisma/client";

export type ContractActionResult = { success: true; contractId?: string } | { success: false; error: string };

const contractMetaSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  campaignId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  creatorMemberId: z.string().uuid().optional(),
  expiresAt: z.string().optional(),
});

async function requireContractManager() {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  if (!canManageContracts(actor.agencyRole)) {
    return { actor, agencyId, allowed: false as const, error: "You don't have permission to manage contracts." };
  }
  return { actor, agencyId, allowed: true as const };
}

export async function createContract(formData: FormData): Promise<ContractActionResult> {
  const check = await requireContractManager();
  if (!check.allowed) return { success: false, error: check.error };

  const parsed = contractMetaSchema.safeParse({
    title: formData.get("title"),
    campaignId: formData.get("campaignId") || undefined,
    brandId: formData.get("brandId") || undefined,
    creatorMemberId: formData.get("creatorMemberId") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!parsed.data.campaignId && !parsed.data.brandId && !parsed.data.creatorMemberId) {
    return { success: false, error: "Link this contract to a campaign, brand, or creator." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choose a PDF to upload." };

  const path = `${check.actor.organizationId}/${check.agencyId}/contracts/${crypto.randomUUID()}-${file.name}`;
  const fileUrl = await uploadAgencyFile(path, file);

  const contract = await prisma.contract.create({
    data: {
      organizationId: check.actor.organizationId,
      agencyId: check.agencyId,
      campaignId: parsed.data.campaignId || null,
      brandId: parsed.data.brandId || null,
      creatorMemberId: parsed.data.creatorMemberId || null,
      title: parsed.data.title,
      fileUrl,
      fileName: file.name,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      createdById: check.actor.id,
    },
  });

  await prisma.contractVersion.create({
    data: { contractId: contract.id, versionNumber: 1, fileUrl, fileName: file.name, uploadedById: check.actor.id },
  });

  await logAudit({
    organizationId: check.actor.organizationId,
    actorId: check.actor.id,
    action: "contract.created",
    entityType: "contract",
    entityId: contract.id,
    after: { title: contract.title },
  });

  revalidatePath("/agency/contracts");
  return { success: true, contractId: contract.id };
}

export async function uploadContractVersion(contractId: string, formData: FormData): Promise<ContractActionResult> {
  const check = await requireContractManager();
  if (!check.allowed) return { success: false, error: check.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choose a PDF to upload." };

  const contract = await prisma.contract.findFirst({ where: { id: contractId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!contract) return { success: false, error: "Contract not found." };

  const path = `${check.actor.organizationId}/${check.agencyId}/contracts/${crypto.randomUUID()}-${file.name}`;
  const fileUrl = await uploadAgencyFile(path, file);

  const latest = await prisma.contractVersion.findFirst({ where: { contractId }, orderBy: { versionNumber: "desc" } });
  const nextVersion = (latest?.versionNumber ?? 0) + 1;

  await prisma.$transaction([
    prisma.contractVersion.create({
      data: { contractId, versionNumber: nextVersion, fileUrl, fileName: file.name, uploadedById: check.actor.id },
    }),
    prisma.contract.update({ where: { id: contractId }, data: { fileUrl, fileName: file.name } }),
  ]);

  revalidatePath(`/agency/contracts/${contractId}`);
  return { success: true, contractId };
}

async function setContractStatus(contractId: string, status: ContractStatus): Promise<ContractActionResult> {
  const check = await requireContractManager();
  if (!check.allowed) return { success: false, error: check.error };

  const contract = await prisma.contract.findFirst({ where: { id: contractId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!contract) return { success: false, error: "Contract not found." };

  await prisma.contract.update({
    where: { id: contractId },
    data: { status, ...(status === "SIGNED" ? { signedAt: new Date() } : {}), ...(status === "SENT" ? { sentAt: new Date() } : {}) },
  });

  if (status === "SIGNED") {
    await logAgencyActivity({
      organizationId: check.actor.organizationId,
      agencyId: check.agencyId,
      type: "CONTRACT_SIGNED",
      actorId: check.actor.id,
      message: `"${contract.title}" was marked signed`,
    });
  }

  revalidatePath(`/agency/contracts/${contractId}`);
  revalidatePath("/agency/contracts");
  return { success: true, contractId };
}

/** Manual status toggle — works today without any e-signature provider configured. */
export async function updateContractStatus(contractId: string, status: ContractStatus): Promise<ContractActionResult> {
  return setContractStatus(contractId, status);
}

export async function deleteContract(contractId: string): Promise<ContractActionResult> {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  if (!canDeleteContract(actor.agencyRole)) return { success: false, error: "You don't have permission to delete contracts." };

  const contract = await prisma.contract.findFirst({ where: { id: contractId, organizationId: actor.organizationId, agencyId } });
  if (!contract) return { success: false, error: "Contract not found." };

  await prisma.contract.delete({ where: { id: contractId } });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "contract.deleted",
    entityType: "contract",
    entityId: contractId,
    before: { title: contract.title },
  });

  revalidatePath("/agency/contracts");
  return { success: true };
}

/** Sends the current file for e-signature via DocuSign — reports "not configured" cleanly if DOCUSIGN_* env vars aren't set yet. */
export async function sendContractForSignatureAction(
  contractId: string,
  recipientEmail: string,
  recipientName: string
): Promise<ContractActionResult> {
  const check = await requireContractManager();
  if (!check.allowed) return { success: false, error: check.error };

  const contract = await prisma.contract.findFirst({ where: { id: contractId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!contract) return { success: false, error: "Contract not found." };

  const result = await sendForSignature(contractId, recipientEmail.trim(), recipientName.trim());
  if (!result.success) return { success: false, error: result.error };

  revalidatePath(`/agency/contracts/${contractId}`);
  return { success: true, contractId };
}

/** Polling fallback the UI can trigger manually ("Check status") when DocuSign Connect webhooks aren't set up. */
export async function refreshContractStatusAction(contractId: string): Promise<ContractActionResult> {
  const check = await requireContractManager();
  if (!check.allowed) return { success: false, error: check.error };

  const result = await refreshContractEnvelopeStatus(contractId);
  if (!result.success) return { success: false, error: result.error };

  revalidatePath(`/agency/contracts/${contractId}`);
  return { success: true, contractId };
}
