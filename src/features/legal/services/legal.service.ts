import "server-only";

import type { LegalDocumentType, LegalPageType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getRequestIp, getRequestUserAgent } from "@/lib/http/request-meta";
import { LEGAL_DOCUMENTS, getDocumentHref } from "@/features/legal/documents";
import {
  getCurrentVersion,
  getRequiredVersion,
  pageTypeFor,
  LEGAL_PAGE_TYPES,
  getLatestPublishedVersionRow,
} from "@/features/legal/services/legal-documents.service";

/** Every consent a signup flow must capture — the 4 checkboxes the user
 * sees, expanded so the combined "Media Release and Release of Liability"
 * checkbox produces two distinct, independently versioned records. */
export const REQUIRED_ACCEPTANCE_TYPES: LegalDocumentType[] = [
  "TERMS",
  "PRIVACY",
  "DATA_PROCESSING",
  "MEDIA_RELEASE",
  "LIABILITY_RELEASE",
];

export type AcceptanceMeta = { ipAddress: string | null; userAgent: string | null };

export type AcceptanceInput = {
  documentType: LegalDocumentType;
  version: string;
  accepted: true;
  acceptedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

/** Builds the 5 acceptance rows a signup/re-accept submission writes,
 * stamping each against the document's current published version (DB-
 * backed — see legal-documents.service.ts). Every row shares the same
 * acceptedAt so a single submission always reads back as one moment. */
export async function buildAcceptanceInputs(
  organizationId: string,
  meta: AcceptanceMeta,
  acceptedAt: Date = new Date()
): Promise<AcceptanceInput[]> {
  return Promise.all(
    REQUIRED_ACCEPTANCE_TYPES.map(async (documentType) => ({
      documentType,
      version: await getCurrentVersion(organizationId, documentType),
      accepted: true as const,
      acceptedAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }))
  );
}

/** Captures the current request's IP/user agent and builds the 5 acceptance
 * inputs in one call — the version every signup form action reaches for. */
export async function buildAcceptanceInputsFromRequest(organizationId: string): Promise<AcceptanceInput[]> {
  const [ipAddress, userAgent] = await Promise.all([getRequestIp(), getRequestUserAgent()]);
  return buildAcceptanceInputs(organizationId, { ipAddress, userAgent });
}

/** Only the documents whose acceptance no longer matches what's currently
 * required — used both to decide whether to show the re-acceptance banner
 * and to build the inputs for a targeted re-accept submission. */
export async function getOutstandingAcceptanceTypes(
  organizationId: string,
  memberId: string
): Promise<LegalDocumentType[]> {
  const latest = await getLatestAcceptanceByType(memberId);
  const outstanding: LegalDocumentType[] = [];
  for (const documentType of REQUIRED_ACCEPTANCE_TYPES) {
    const required = await getRequiredVersion(organizationId, documentType);
    const accepted = latest.get(documentType);
    if (!accepted || accepted.version !== required) outstanding.push(documentType);
  }
  return outstanding;
}

/**
 * /apply submission time — no Member exists yet, so these are captured
 * against the MembershipApplication and materialized onto a Member later
 * (see materializeLegalAcceptancesForMember), if and when it's approved.
 */
export async function recordApplicationLegalAcceptances(applicationId: string, inputs: AcceptanceInput[]) {
  await prisma.membershipApplicationLegalAcceptance.createMany({
    data: inputs.map((input) => ({ applicationId, ...input })),
  });
}

/** Invite-based /signup, and self-service re-acceptance — the Member row
 * already exists, so acceptances are written directly against it.
 * `skipDuplicates` makes re-submitting the same version a no-op instead of
 * a unique-constraint error. */
export async function recordMemberLegalAcceptances(memberId: string, inputs: AcceptanceInput[]) {
  await prisma.legalAcceptance.createMany({
    data: inputs.map((input) => ({ memberId, ...input })),
    skipDuplicates: true,
  });
}

/**
 * The moment an application is approved and its Member row is created —
 * copies the original submission-time acceptances (real version/timestamp/
 * IP/user agent, not the approval moment) onto the new Member.
 * `skipDuplicates` guards against this ever running twice for the same
 * application (approve is already guarded by status !== "PENDING", but the
 * unique constraint plus this makes the copy itself idempotent too).
 */
export async function materializeLegalAcceptancesForMember(applicationId: string, memberId: string) {
  const applicationAcceptances = await prisma.membershipApplicationLegalAcceptance.findMany({
    where: { applicationId },
  });
  if (applicationAcceptances.length === 0) return;

  await prisma.legalAcceptance.createMany({
    data: applicationAcceptances.map((a) => ({
      memberId,
      documentType: a.documentType,
      version: a.version,
      accepted: a.accepted,
      acceptedAt: a.acceptedAt,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
    })),
    skipDuplicates: true,
  });
}

async function getLatestAcceptanceByType(memberId: string) {
  const rows = await prisma.legalAcceptance.findMany({
    where: { memberId },
    orderBy: { acceptedAt: "desc" },
  });
  const latestByType = new Map<LegalDocumentType, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByType.has(row.documentType)) latestByType.set(row.documentType, row);
  }
  return latestByType;
}

export type MemberLegalAcceptanceView = {
  documentType: LegalDocumentType;
  title: string;
  href: string;
  /** Absolute latest published version, major or minor — purely informational. */
  currentVersion: string;
  currentEffectiveDate: string;
  /** Latest published version that actually requires re-acceptance (ignores minors). */
  requiredVersion: string;
  acceptedVersion: string | null;
  acceptedAt: Date | null;
  /** acceptedVersion === currentVersion — nothing newer exists at all. */
  isCurrent: boolean;
  /** acceptedVersion === requiredVersion — legally sufficient even if a minor exists. */
  isCompliant: boolean;
};

/** Settings > Legal (and the admin Compliance Dashboard) — the member's own
 * acceptance record for every required document, alongside both the
 * absolute-current and compliance-required versions so "a new version
 * exists" and "you must re-accept" can be shown as the two distinct states
 * they are. DATA_PROCESSING has no page of its own, so it's shown under
 * the Privacy Policy's title but keeps its own acceptance record. */
export async function getMemberLegalAcceptances(
  organizationId: string,
  memberId: string
): Promise<MemberLegalAcceptanceView[]> {
  const [latest, pageRows] = await Promise.all([
    getLatestAcceptanceByType(memberId),
    Promise.all(
      LEGAL_PAGE_TYPES.map(async (pageType) => {
        const [current, required] = await Promise.all([
          getLatestPublishedVersionRow(organizationId, pageType),
          getRequiredVersion(organizationId, pageType as LegalDocumentType),
        ]);
        return [pageType, { current, required }] as const;
      })
    ),
  ]);
  const pageInfo = new Map<LegalPageType, { current: Awaited<ReturnType<typeof getLatestPublishedVersionRow>>; required: string }>(
    pageRows
  );

  return REQUIRED_ACCEPTANCE_TYPES.map((documentType) => {
    const pageType = pageTypeFor(documentType);
    const info = pageInfo.get(pageType);
    const currentVersion = info?.current?.version ?? LEGAL_DOCUMENTS[pageType].version;
    const currentEffectiveDate = info?.current?.effectiveDate
      ? info.current.effectiveDate.toISOString().slice(0, 10)
      : LEGAL_DOCUMENTS[pageType].effectiveDate;
    const requiredVersion = info?.required ?? currentVersion;
    const accepted = latest.get(documentType) ?? null;
    const title = documentType === "DATA_PROCESSING" ? "Consent to Data Processing" : (info?.current?.title ?? LEGAL_DOCUMENTS[pageType].title);

    return {
      documentType,
      title,
      href: getDocumentHref(documentType),
      currentVersion,
      currentEffectiveDate,
      requiredVersion,
      acceptedVersion: accepted?.version ?? null,
      acceptedAt: accepted?.acceptedAt ?? null,
      isCurrent: accepted?.version === currentVersion,
      isCompliant: accepted?.version === requiredVersion,
    };
  });
}
