import "server-only";

import type { LegalDocumentType, LegalPageType, LegalVersionKind } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { notifyMembers } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";
import { LEGAL_DOCUMENTS, getSeedVersion, getDocumentHref } from "@/features/legal/documents";
import type { LegalDocumentDefinition, LegalSection } from "@/features/legal/types";

export const LEGAL_PAGE_TYPES: LegalPageType[] = ["TERMS", "PRIVACY", "MEDIA_RELEASE", "LIABILITY_RELEASE"];

/** Same "single default org" resolution already used by /apply and the
 * kiosk — this app is single-tenant in practice, and the public /legal/*
 * pages have no authenticated session to resolve an org from otherwise. */
export async function getDefaultOrganizationId(): Promise<string | null> {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  return organization?.id ?? null;
}

/** DATA_PROCESSING has no page/version history of its own — its consent is
 * governed by whichever document actually carries its content (Privacy). */
export function pageTypeFor(documentType: LegalDocumentType): LegalPageType {
  return documentType === "DATA_PROCESSING" ? "PRIVACY" : (documentType as LegalPageType);
}

/** The absolute latest published row, major or minor — what's shown as
 * "the current version" everywhere (document cards, public pages,
 * downloads) and what gets recorded on a brand-new acceptance. */
export async function getLatestPublishedVersionRow(organizationId: string, documentType: LegalPageType) {
  return prisma.legalDocumentVersion.findFirst({
    where: { organizationId, documentType, status: "PUBLISHED" },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
  });
}

/** The latest published row that actually requires re-acceptance -- i.e.
 * ignores MINOR publishes. This, not getLatestPublishedVersionRow, is what
 * a member's stored acceptance must match to be considered compliant. */
export async function getRequiredVersionRow(organizationId: string, documentType: LegalPageType) {
  return prisma.legalDocumentVersion.findFirst({
    where: { organizationId, documentType, status: "PUBLISHED", NOT: { versionKind: "MINOR" } },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getCurrentVersion(organizationId: string, documentType: LegalDocumentType): Promise<string> {
  const row = await getLatestPublishedVersionRow(organizationId, pageTypeFor(documentType));
  return row?.version ?? getSeedVersion(documentType);
}

export async function getRequiredVersion(organizationId: string, documentType: LegalDocumentType): Promise<string> {
  const row = await getRequiredVersionRow(organizationId, pageTypeFor(documentType));
  if (row) return row.version;
  return getCurrentVersion(organizationId, documentType);
}

/** The rendered-page shape (title/summary/sections/version/effectiveDate)
 * for a document's current published version — falls back to the static
 * seed content if, somehow, nothing has ever been published (should only
 * happen if prisma/seed-legal-versions.ts hasn't run yet). */
export async function getPublishedDocumentView(
  organizationId: string,
  documentType: LegalPageType
): Promise<LegalDocumentDefinition> {
  const row = await getLatestPublishedVersionRow(organizationId, documentType);
  if (!row) return LEGAL_DOCUMENTS[documentType];

  return {
    type: documentType,
    slug: LEGAL_DOCUMENTS[documentType].slug,
    title: row.title,
    version: row.version,
    effectiveDate: (row.effectiveDate ?? row.createdAt).toISOString().slice(0, 10),
    summary: row.summary,
    sections: row.sections as unknown as LegalSection[],
  };
}

export async function listVersions(organizationId: string, documentType: LegalPageType) {
  return prisma.legalDocumentVersion.findMany({
    where: { organizationId, documentType },
    orderBy: [{ createdAt: "desc" }],
    include: {
      publishedBy: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function getVersionById(organizationId: string, versionId: string) {
  return prisma.legalDocumentVersion.findFirst({
    where: { id: versionId, organizationId },
    include: {
      publishedBy: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
}

export type DraftInput = {
  version: string;
  title: string;
  summary: string;
  sections: LegalSection[];
  changeSummary?: string | null;
};

/**
 * Never overwrites a prior version -- always inserts a new DRAFT row.
 * Pre-fills from the current published version when the caller doesn't
 * supply full content, so "start a new draft" is a one-click action from
 * the document dashboard rather than a blank form.
 */
export async function createDraft(
  organizationId: string,
  documentType: LegalPageType,
  input: DraftInput,
  createdById: string
) {
  const draft = await prisma.legalDocumentVersion.create({
    data: {
      organizationId,
      documentType,
      version: input.version,
      title: input.title,
      summary: input.summary,
      sections: input.sections,
      changeSummary: input.changeSummary ?? null,
      status: "DRAFT",
      createdById,
    },
  });

  await logAudit({
    organizationId,
    actorId: createdById,
    action: "legal.document.draft_created",
    entityType: "legal_document_version",
    entityId: draft.id,
    after: { documentType, version: draft.version },
  });

  return draft;
}

export async function updateDraft(
  organizationId: string,
  versionId: string,
  input: Partial<DraftInput>,
  actorId: string
) {
  const existing = await prisma.legalDocumentVersion.findFirst({ where: { id: versionId, organizationId } });
  if (!existing) throw new Error("Version not found.");
  if (existing.status !== "DRAFT") throw new Error("Only drafts can be edited — publish a new version instead.");

  const updated = await prisma.legalDocumentVersion.update({
    where: { id: versionId },
    data: {
      version: input.version ?? undefined,
      title: input.title ?? undefined,
      summary: input.summary ?? undefined,
      sections: input.sections ?? undefined,
      changeSummary: input.changeSummary === undefined ? undefined : input.changeSummary,
    },
  });

  await logAudit({
    organizationId,
    actorId,
    action: "legal.document.draft_updated",
    entityType: "legal_document_version",
    entityId: updated.id,
    before: { version: existing.version, title: existing.title },
    after: { version: updated.version, title: updated.title },
  });

  return updated;
}

export async function deleteDraft(organizationId: string, versionId: string, actorId: string) {
  const existing = await prisma.legalDocumentVersion.findFirst({ where: { id: versionId, organizationId } });
  if (!existing) throw new Error("Version not found.");
  if (existing.status !== "DRAFT") throw new Error("Only drafts can be deleted.");

  await prisma.legalDocumentVersion.delete({ where: { id: versionId } });

  await logAudit({
    organizationId,
    actorId,
    action: "legal.document.draft_deleted",
    entityType: "legal_document_version",
    entityId: versionId,
    before: { documentType: existing.documentType, version: existing.version },
  });
}

export type PublishInput = {
  kind: LegalVersionKind;
  effectiveDate?: Date;
  changeSummary?: string;
};

/**
 * The core publish workflow. MAJOR publishes mark every existing member's
 * acceptance of this document (and, for PRIVACY, the DATA_PROCESSING
 * consent riding on it) as outdated -- computed on read via
 * getRequiredVersion, never written as a stored flag -- and fan out a
 * notification + banner + email to every active member. MINOR publishes
 * just move "the current version" forward with no re-acceptance impact.
 */
export async function publishVersion(
  organizationId: string,
  versionId: string,
  input: PublishInput,
  actor: { id: string; fullName: string }
) {
  const draft = await prisma.legalDocumentVersion.findFirst({ where: { id: versionId, organizationId } });
  if (!draft) throw new Error("Version not found.");
  if (draft.status !== "DRAFT") throw new Error("This version has already been published.");

  const effectiveDate = input.effectiveDate ?? new Date();

  const published = await prisma.legalDocumentVersion.update({
    where: { id: versionId },
    data: {
      status: "PUBLISHED",
      versionKind: input.kind,
      changeSummary: input.changeSummary ?? draft.changeSummary,
      effectiveDate,
      publishedAt: new Date(),
      publishedById: actor.id,
    },
  });

  await logAudit({
    organizationId,
    actorId: actor.id,
    action: "legal.document.published",
    entityType: "legal_document_version",
    entityId: published.id,
    after: { documentType: published.documentType, version: published.version, kind: input.kind },
  });

  if (input.kind === "MAJOR") {
    await notifyAndEmailAffectedMembers(organizationId, published);
  }

  return published;
}

async function notifyAndEmailAffectedMembers(
  organizationId: string,
  published: { id: string; documentType: LegalPageType; title: string; version: string; effectiveDate: Date | null }
) {
  const members = await prisma.member.findMany({
    where: { organizationId, status: "ACTIVE", deletedAt: null },
    select: { id: true, email: true, fullName: true },
  });
  if (members.length === 0) return;

  await notifyMembers(
    members.map((m) => m.id),
    {
      type: "LEGAL_DOCUMENT_UPDATED",
      title: `${published.title} updated to v${published.version}`,
      body: "Please review and accept the updated document to continue using CreatorHub360.",
      link: "/legal/reaccept",
    }
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const effectiveDateIso = (published.effectiveDate ?? new Date()).toISOString();
  for (const member of members) {
    await EmailService.sendLegalDocumentUpdatedEmail({
      to: member.email,
      fullName: member.fullName,
      documentTitle: published.title,
      version: published.version,
      effectiveDate: effectiveDateIso,
      reviewUrl: `${appUrl}${getDocumentHref(published.documentType as unknown as LegalDocumentType)}`,
      reacceptUrl: `${appUrl}/legal/reaccept`,
      organizationId,
      memberId: member.id,
    });
  }
}
