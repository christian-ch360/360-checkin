"use server";

import { revalidatePath } from "next/cache";
import type { LegalDocumentType, LegalPageType, LegalVersionKind } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { getRequestIp, getRequestUserAgent } from "@/lib/http/request-meta";
import type { LegalSection } from "@/features/legal/types";
import {
  createDraft,
  updateDraft,
  deleteDraft,
  publishVersion,
  getCurrentVersion,
  type DraftInput,
} from "@/features/legal/services/legal-documents.service";
import {
  getMemberComplianceDetail,
  type MemberComplianceDetail,
} from "@/features/legal/services/compliance.service";
import { REQUIRED_ACCEPTANCE_TYPES, recordMemberLegalAcceptances } from "@/features/legal/services/legal.service";

export type LegalActionResult = { success: true } | { success: false; error: string };

async function requireLegalManage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "legal.manage")) throw new Error("Not authorized.");
  return actor;
}

async function requireLegalPublish() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "legal.publish")) {
    throw new Error("Only Super Admins can perform this action.");
  }
  return actor;
}

export type DraftFormInput = {
  version: string;
  title: string;
  summary: string;
  changeSummary?: string;
  sections: { heading: string; body: string }[];
};

function toSections(input: DraftFormInput["sections"]): LegalSection[] {
  return input.map((s, i) => ({
    id: s.heading.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `section-${i + 1}`,
    heading: s.heading,
    body: s.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
  }));
}

export async function createLegalDraftAction(
  documentType: LegalPageType,
  input: DraftFormInput
): Promise<LegalActionResult> {
  let actor;
  try {
    actor = await requireLegalManage();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  try {
    const draftInput: DraftInput = {
      version: input.version,
      title: input.title,
      summary: input.summary,
      changeSummary: input.changeSummary ?? null,
      sections: toSections(input.sections),
    };
    await createDraft(actor.organizationId, documentType, draftInput, actor.id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create draft." };
  }

  revalidatePath(`/admin/legal/${documentType}`);
  revalidatePath("/admin/legal");
  return { success: true };
}

export async function updateLegalDraftAction(
  documentType: LegalPageType,
  versionId: string,
  input: DraftFormInput
): Promise<LegalActionResult> {
  let actor;
  try {
    actor = await requireLegalManage();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  try {
    const draftInput: Partial<DraftInput> = {
      version: input.version,
      title: input.title,
      summary: input.summary,
      changeSummary: input.changeSummary ?? null,
      sections: toSections(input.sections),
    };
    await updateDraft(actor.organizationId, versionId, draftInput, actor.id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update draft." };
  }

  revalidatePath(`/admin/legal/${documentType}`);
  revalidatePath("/admin/legal");
  return { success: true };
}

/** Deleting a draft is Super Admin-only — see the permission split with
 * legal.manage/legal.publish in lib/permissions/index.ts. */
export async function deleteLegalDraftAction(
  documentType: LegalPageType,
  versionId: string
): Promise<LegalActionResult> {
  let actor;
  try {
    actor = await requireLegalPublish();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  try {
    await deleteDraft(actor.organizationId, versionId, actor.id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete draft." };
  }

  revalidatePath(`/admin/legal/${documentType}`);
  revalidatePath("/admin/legal");
  return { success: true };
}

export type PublishFormInput = {
  kind: LegalVersionKind;
  effectiveDate?: string;
  changeSummary?: string;
};

/** Publishing (and therefore version numbers, since a version becomes
 * permanent the moment it publishes) is Super Admin-only. */
export async function publishLegalVersionAction(
  documentType: LegalPageType,
  versionId: string,
  input: PublishFormInput
): Promise<LegalActionResult> {
  let actor;
  try {
    actor = await requireLegalPublish();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  try {
    await publishVersion(
      actor.organizationId,
      versionId,
      {
        kind: input.kind,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : undefined,
        changeSummary: input.changeSummary,
      },
      { id: actor.id, fullName: actor.fullName }
    );
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to publish version." };
  }

  revalidatePath(`/admin/legal/${documentType}`);
  revalidatePath("/admin/legal");
  revalidatePath("/admin/legal/compliance");
  return { success: true };
}

/** includeSensitive (IP/User Agent) is only ever true for legal.publish
 * (Super Admin) callers — "never expose IP addresses or user agents to
 * unauthorized users" applies even to Admins who can otherwise view
 * everything else on this dashboard. */
export async function fetchMemberComplianceDetailAction(memberId: string): Promise<MemberComplianceDetail> {
  const actor = await requireLegalManage();
  const includeSensitive = hasPermission(actor.systemRole, "legal.publish");
  const detail = await getMemberComplianceDetail(actor.organizationId, memberId, includeSensitive);
  if (!detail) throw new Error("Member not found.");
  return detail;
}

/**
 * Invalidates a member's acceptance so they read as requiring
 * re-acceptance again — there's no stored "forced" flag (compliance is
 * always derived from version comparison, see compliance.service.ts), so
 * forcing re-acceptance means removing the stale acceptance row(s)
 * themselves. Super Admin-only, fully audit-logged with the removed rows
 * captured in `before`.
 */
export async function forceReacceptanceAction(
  memberId: string,
  documentType?: LegalDocumentType
): Promise<LegalActionResult> {
  let actor;
  try {
    actor = await requireLegalPublish();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!member) return { success: false, error: "Member not found." };

  const types = documentType ? [documentType] : REQUIRED_ACCEPTANCE_TYPES;
  const removed = await prisma.legalAcceptance.findMany({
    where: { memberId, documentType: { in: types } },
  });
  if (removed.length === 0) return { success: false, error: "This member has no acceptances to invalidate." };

  await prisma.legalAcceptance.deleteMany({ where: { memberId, documentType: { in: types } } });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "legal.member.forced_reaccept",
    entityType: "member",
    entityId: memberId,
    before: { documentTypes: types, removedVersions: removed.map((r) => ({ documentType: r.documentType, version: r.version })) },
  });

  revalidatePath("/admin/legal/compliance");
  return { success: true };
}

/**
 * The member-facing counterpart to forceReacceptanceAction — records a
 * fresh acceptance (current version, current request's IP/UA) for exactly
 * the document types the caller passed, used by the /legal/reaccept page.
 */
export async function reacceptLegalDocumentsAction(documentTypes: LegalDocumentType[]): Promise<LegalActionResult> {
  const actor = await requireCurrentMember();
  const validTypes = documentTypes.filter((t) => REQUIRED_ACCEPTANCE_TYPES.includes(t));
  if (validTypes.length === 0) return { success: false, error: "No documents selected." };

  const [ipAddress, userAgent] = await Promise.all([getRequestIp(), getRequestUserAgent()]);
  const acceptedAt = new Date();

  const inputs = await Promise.all(
    validTypes.map(async (documentType) => ({
      documentType,
      version: await getCurrentVersion(actor.organizationId, documentType),
      accepted: true as const,
      acceptedAt,
      ipAddress,
      userAgent,
    }))
  );

  await recordMemberLegalAcceptances(actor.id, inputs);

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "legal.member.reaccepted",
    entityType: "member",
    entityId: actor.id,
    after: { documentTypes: validTypes },
  });

  revalidatePath("/legal/reaccept");
  revalidatePath("/settings");
  return { success: true };
}
