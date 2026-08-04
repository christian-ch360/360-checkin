import type { LegalDocumentType } from "@prisma/client";
import type { LegalDocumentDefinition, LegalPageDocumentType } from "@/features/legal/types";
import { TERMS_DOCUMENT } from "@/features/legal/documents/terms";
import { PRIVACY_DOCUMENT } from "@/features/legal/documents/privacy";
import { MEDIA_RELEASE_DOCUMENT } from "@/features/legal/documents/media-release";
import { LIABILITY_RELEASE_DOCUMENT } from "@/features/legal/documents/liability-release";

/**
 * Single source of truth for every legal document's content and version.
 * To publish a revision: edit the relevant document file's `sections` and
 * bump its `version` (and `effectiveDate`) here — every consumer (the public
 * /legal/* pages, the signup consent checkboxes, and Settings > Legal)
 * reads from this registry, so nothing else needs to change.
 */
export const LEGAL_DOCUMENTS: Record<LegalPageDocumentType, LegalDocumentDefinition> = {
  TERMS: TERMS_DOCUMENT,
  PRIVACY: PRIVACY_DOCUMENT,
  MEDIA_RELEASE: MEDIA_RELEASE_DOCUMENT,
  LIABILITY_RELEASE: LIABILITY_RELEASE_DOCUMENT,
};

export const LEGAL_DOCUMENT_LIST = Object.values(LEGAL_DOCUMENTS);

/**
 * The version each document ships with in this codebase — used only as a
 * seed for the very first LegalDocumentVersion row (see
 * prisma/seed-legal-versions.ts) and as a last-resort fallback if the DB
 * has no published row yet. The real, live "current version" once the app
 * is running is always DB-backed — see
 * features/legal/services/legal-documents.service.ts's getCurrentVersion.
 */
export function getSeedVersion(type: LegalDocumentType): string {
  if (type === "DATA_PROCESSING") return LEGAL_DOCUMENTS.PRIVACY.version;
  return LEGAL_DOCUMENTS[type].version;
}

export function getDocumentHref(type: LegalDocumentType): string {
  if (type === "DATA_PROCESSING") return "/legal/privacy#data-processing";
  return `/legal/${LEGAL_DOCUMENTS[type].slug}`;
}
