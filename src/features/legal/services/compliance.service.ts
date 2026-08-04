import "server-only";

import type { LegalDocumentType, LegalPageType, MemberRole, MemberStatus, SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { LEGAL_DOCUMENTS, getSeedVersion } from "@/features/legal/documents";
import { REQUIRED_ACCEPTANCE_TYPES } from "@/features/legal/services/legal.service";
import {
  LEGAL_PAGE_TYPES,
  pageTypeFor,
  getLatestPublishedVersionRow,
  getRequiredVersionRow,
} from "@/features/legal/services/legal-documents.service";

export type ComplianceStatus = "COMPLIANT" | "NEEDS_REACCEPTANCE" | "PENDING" | "NEVER_ACCEPTED";

type VersionInfo = {
  current: Awaited<ReturnType<typeof getLatestPublishedVersionRow>>;
  required: Awaited<ReturnType<typeof getRequiredVersionRow>>;
};

async function getVersionMap(organizationId: string): Promise<Map<LegalPageType, VersionInfo>> {
  const entries = await Promise.all(
    LEGAL_PAGE_TYPES.map(async (pageType) => {
      const [current, required] = await Promise.all([
        getLatestPublishedVersionRow(organizationId, pageType),
        getRequiredVersionRow(organizationId, pageType),
      ]);
      return [pageType, { current, required }] as const;
    })
  );
  return new Map(entries);
}

function currentVersionFor(versionMap: Map<LegalPageType, VersionInfo>, documentType: LegalDocumentType): string {
  const info = versionMap.get(pageTypeFor(documentType));
  return info?.current?.version ?? getSeedVersion(documentType);
}

function requiredVersionFor(versionMap: Map<LegalPageType, VersionInfo>, documentType: LegalDocumentType): string {
  const info = versionMap.get(pageTypeFor(documentType));
  return info?.required?.version ?? info?.current?.version ?? getSeedVersion(documentType);
}

type RawAcceptance = { documentType: LegalDocumentType; version: string; acceptedAt: Date; ipAddress: string | null; userAgent: string | null };

export type DocumentComplianceEntry = {
  documentType: LegalDocumentType;
  requiredVersion: string;
  acceptedVersion: string | null;
  acceptedAt: Date | null;
  compliant: boolean;
};

export type ComplianceRow = {
  memberId: string;
  fullName: string;
  email: string;
  role: MemberRole;
  systemRole: SystemRole;
  memberStatus: MemberStatus;
  documents: Record<LegalDocumentType, DocumentComplianceEntry>;
  lastAcceptedAt: Date | null;
  status: ComplianceStatus;
};

function statusFor(memberStatus: MemberStatus, hasAnyAcceptance: boolean, allCompliant: boolean): ComplianceStatus {
  if (memberStatus === "PENDING") return "PENDING";
  if (!hasAnyAcceptance) return "NEVER_ACCEPTED";
  return allCompliant ? "COMPLIANT" : "NEEDS_REACCEPTANCE";
}

/**
 * The single query that computes every member's per-document compliance —
 * every KPI, the compliance table, and the document management cards are
 * all derived from this same snapshot so their numbers can never disagree
 * with each other.
 */
export async function getComplianceSnapshot(organizationId: string): Promise<ComplianceRow[]> {
  const versionMap = await getVersionMap(organizationId);

  const members = await prisma.member.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      systemRole: true,
      status: true,
      legalAcceptances: {
        select: { documentType: true, version: true, acceptedAt: true, ipAddress: true, userAgent: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  return members.map((member) => {
    const latestByType = new Map<LegalDocumentType, RawAcceptance>();
    for (const acceptance of member.legalAcceptances) {
      const existing = latestByType.get(acceptance.documentType);
      if (!existing || acceptance.acceptedAt > existing.acceptedAt) latestByType.set(acceptance.documentType, acceptance);
    }

    const documents = {} as Record<LegalDocumentType, DocumentComplianceEntry>;
    let allCompliant = true;
    for (const documentType of REQUIRED_ACCEPTANCE_TYPES) {
      const accepted = latestByType.get(documentType) ?? null;
      const requiredVersion = requiredVersionFor(versionMap, documentType);
      const compliant = accepted?.version === requiredVersion;
      if (!compliant) allCompliant = false;
      documents[documentType] = {
        documentType,
        requiredVersion,
        acceptedVersion: accepted?.version ?? null,
        acceptedAt: accepted?.acceptedAt ?? null,
        compliant,
      };
    }

    const lastAcceptedAt = member.legalAcceptances.reduce<Date | null>(
      (latest, a) => (!latest || a.acceptedAt > latest ? a.acceptedAt : latest),
      null
    );

    return {
      memberId: member.id,
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      systemRole: member.systemRole,
      memberStatus: member.status,
      documents,
      lastAcceptedAt,
      status: statusFor(member.status, member.legalAcceptances.length > 0, allCompliant),
    };
  });
}

export type ComplianceFilters = {
  role?: MemberRole;
  status?: ComplianceStatus;
  documentType?: LegalDocumentType;
  search?: string;
  from?: Date;
  to?: Date;
};

/** Row-level status, optionally narrowed to a single document — "Needs
 * Re-Acceptance for Terms" and "Needs Re-Acceptance overall" are different
 * questions, and the Document filter switches between them. */
function effectiveStatus(row: ComplianceRow, documentType?: LegalDocumentType): ComplianceStatus {
  if (!documentType) return row.status;
  if (row.memberStatus === "PENDING") return "PENDING";
  const doc = row.documents[documentType];
  if (!doc.acceptedVersion) return "NEVER_ACCEPTED";
  return doc.compliant ? "COMPLIANT" : "NEEDS_REACCEPTANCE";
}

export async function listComplianceRows(
  organizationId: string,
  filters: ComplianceFilters = {}
): Promise<ComplianceRow[]> {
  const rows = await getComplianceSnapshot(organizationId);
  const search = filters.search?.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.role && row.role !== filters.role) return false;
    if (filters.status && effectiveStatus(row, filters.documentType) !== filters.status) return false;
    if (filters.from && (!row.lastAcceptedAt || row.lastAcceptedAt < filters.from)) return false;
    if (filters.to && (!row.lastAcceptedAt || row.lastAcceptedAt > filters.to)) return false;
    if (search && !row.fullName.toLowerCase().includes(search) && !row.email.toLowerCase().includes(search)) return false;
    return true;
  });
}

export type LegalDashboardKpis = {
  documentVersions: { documentType: LegalPageType; title: string; version: string; effectiveDate: string | null }[];
  totalMembers: number;
  fullyCompliant: number;
  needsReacceptance: number;
  pendingApplications: number;
  applicationsMissingConsents: number;
  documentsUpdatedThisYear: number;
};

export async function getLegalDashboardKpis(organizationId: string): Promise<LegalDashboardKpis> {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [rows, versionMap, pendingApplications, applicationsMissingConsents, documentsUpdatedThisYear] =
    await Promise.all([
      getComplianceSnapshot(organizationId),
      getVersionMap(organizationId),
      prisma.membershipApplication.count({ where: { organizationId, status: "PENDING" } }),
      prisma.membershipApplication.count({
        where: {
          organizationId,
          status: "PENDING",
          legalAcceptances: { none: {} },
        },
      }),
      prisma.legalDocumentVersion.count({
        where: { organizationId, status: "PUBLISHED", publishedAt: { gte: yearStart } },
      }),
    ]);

  const documentVersions = LEGAL_PAGE_TYPES.map((pageType) => {
    const info = versionMap.get(pageType);
    return {
      documentType: pageType,
      title: info?.current?.title ?? LEGAL_DOCUMENTS[pageType].title,
      version: info?.current?.version ?? getSeedVersion(pageType as unknown as LegalDocumentType),
      effectiveDate: info?.current?.effectiveDate
        ? info.current.effectiveDate.toISOString().slice(0, 10)
        : (info?.current ? null : LEGAL_DOCUMENTS[pageType].effectiveDate),
    };
  });

  return {
    documentVersions,
    totalMembers: rows.length,
    fullyCompliant: rows.filter((r) => r.status === "COMPLIANT").length,
    needsReacceptance: rows.filter((r) => r.status === "NEEDS_REACCEPTANCE").length,
    pendingApplications,
    applicationsMissingConsents,
    documentsUpdatedThisYear,
  };
}

export type DocumentManagementCard = {
  documentType: LegalPageType;
  title: string;
  currentVersion: string;
  effectiveDate: string | null;
  status: "PUBLISHED" | "NO_PUBLISHED_VERSION";
  hasDraft: boolean;
  totalAcceptances: number;
  membersOnCurrentVersion: number;
  membersOnOlderVersion: number;
  lastUpdated: Date | null;
};

export async function getDocumentManagementCards(organizationId: string): Promise<DocumentManagementCard[]> {
  const [rows, versionMap, draftRows] = await Promise.all([
    getComplianceSnapshot(organizationId),
    getVersionMap(organizationId),
    prisma.legalDocumentVersion.findMany({
      where: { organizationId, status: "DRAFT" },
      select: { documentType: true },
    }),
  ]);
  const draftTypes = new Set(draftRows.map((d) => d.documentType));

  return LEGAL_PAGE_TYPES.map((pageType) => {
    const documentType = pageType as unknown as LegalDocumentType;
    const info = versionMap.get(pageType);
    const currentVersion = info?.current?.version ?? getSeedVersion(documentType);

    let totalAcceptances = 0;
    let membersOnCurrentVersion = 0;
    for (const row of rows) {
      const doc = row.documents[documentType];
      if (!doc.acceptedVersion) continue;
      totalAcceptances += 1;
      if (doc.acceptedVersion === currentVersion) membersOnCurrentVersion += 1;
    }

    return {
      documentType: pageType,
      title: info?.current?.title ?? LEGAL_DOCUMENTS[pageType].title,
      currentVersion,
      effectiveDate: info?.current?.effectiveDate
        ? info.current.effectiveDate.toISOString().slice(0, 10)
        : (info?.current ? null : LEGAL_DOCUMENTS[pageType].effectiveDate),
      status: info?.current ? "PUBLISHED" : "NO_PUBLISHED_VERSION",
      hasDraft: draftTypes.has(pageType),
      totalAcceptances,
      membersOnCurrentVersion,
      membersOnOlderVersion: totalAcceptances - membersOnCurrentVersion,
      lastUpdated: info?.current?.updatedAt ?? null,
    };
  });
}

export type ReportTable = { title: string; columns: { key: string; label: string }[]; rows: Record<string, string | number>[] };

/** The raw per-member data backing every acceptance-rate/compliance-
 * percentage/version-distribution figure shown on the dashboard — the
 * downloadable CSV/XLSX/PDF is this table, not a separately recomputed
 * summary, so it can never drift from what the KPIs show. */
export async function buildLegalComplianceReport(
  organizationId: string,
  filters: ComplianceFilters = {}
): Promise<ReportTable> {
  const rows = await listComplianceRows(organizationId, filters);

  return {
    title: "Legal Compliance Report",
    columns: [
      { key: "fullName", label: "Member Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "termsVersion", label: "Terms Version" },
      { key: "privacyVersion", label: "Privacy Version" },
      { key: "mediaVersion", label: "Media Version" },
      { key: "liabilityVersion", label: "Liability Version" },
      { key: "acceptedAt", label: "Accepted At" },
      { key: "status", label: "Status" },
    ],
    rows: rows.map((row) => ({
      fullName: row.fullName,
      email: row.email,
      role: row.role,
      termsVersion: row.documents.TERMS.acceptedVersion ?? "—",
      privacyVersion: row.documents.PRIVACY.acceptedVersion ?? "—",
      mediaVersion: row.documents.MEDIA_RELEASE.acceptedVersion ?? "—",
      liabilityVersion: row.documents.LIABILITY_RELEASE.acceptedVersion ?? "—",
      acceptedAt: row.lastAcceptedAt ? row.lastAcceptedAt.toISOString().slice(0, 10) : "—",
      status: row.status,
    })),
  };
}

export type MemberComplianceDetail = {
  memberId: string;
  fullName: string;
  email: string;
  role: MemberRole;
  systemRole: SystemRole;
  memberStatus: MemberStatus;
  status: ComplianceStatus;
  documents: {
    documentType: LegalDocumentType;
    title: string;
    requiredVersion: string;
    currentVersion: string;
    /** The first-ever acceptance on record for this document — the original
     * consent captured at signup/application time. */
    original: { version: string; acceptedAt: Date; ipAddress: string | null; userAgent: string | null } | null;
    /** The most recent acceptance — what the member's account currently
     * reflects, which may be the same row as `original` if they've never
     * had to re-accept. */
    current: { version: string; acceptedAt: Date; ipAddress: string | null; userAgent: string | null } | null;
    reacceptanceRequired: boolean;
  }[];
};

/**
 * `includeSensitive` gates ipAddress/userAgent — callers must only pass
 * true when the requesting actor holds "legal.publish" (Super Admin), per
 * "never expose IP addresses or user agents to unauthorized users."
 */
export async function getMemberComplianceDetail(
  organizationId: string,
  memberId: string,
  includeSensitive: boolean
): Promise<MemberComplianceDetail | null> {
  const [member, versionMap] = await Promise.all([
    prisma.member.findFirst({
      where: { id: memberId, organizationId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        systemRole: true,
        status: true,
        legalAcceptances: {
          select: { documentType: true, version: true, acceptedAt: true, ipAddress: true, userAgent: true },
          orderBy: { acceptedAt: "asc" },
        },
      },
    }),
    getVersionMap(organizationId),
  ]);
  if (!member) return null;

  const byType = new Map<LegalDocumentType, RawAcceptance[]>();
  for (const acceptance of member.legalAcceptances) {
    const list = byType.get(acceptance.documentType) ?? [];
    list.push(acceptance);
    byType.set(acceptance.documentType, list);
  }

  const strip = (a: RawAcceptance) => ({
    version: a.version,
    acceptedAt: a.acceptedAt,
    ipAddress: includeSensitive ? a.ipAddress : null,
    userAgent: includeSensitive ? a.userAgent : null,
  });

  let allCompliant = true;
  const documents = REQUIRED_ACCEPTANCE_TYPES.map((documentType) => {
    const list = byType.get(documentType) ?? [];
    const original = list.length > 0 ? list[0] : null;
    const current = list.length > 0 ? list[list.length - 1] : null;
    const requiredVersion = requiredVersionFor(versionMap, documentType);
    const compliant = current?.version === requiredVersion;
    if (!compliant) allCompliant = false;

    const pageType = pageTypeFor(documentType);
    return {
      documentType,
      title:
        documentType === "DATA_PROCESSING"
          ? "Consent to Data Processing"
          : (versionMap.get(pageType)?.current?.title ?? LEGAL_DOCUMENTS[pageType].title),
      requiredVersion,
      currentVersion: currentVersionFor(versionMap, documentType),
      original: original ? strip(original) : null,
      current: current ? strip(current) : null,
      reacceptanceRequired: !compliant,
    };
  });

  return {
    memberId: member.id,
    fullName: member.fullName,
    email: member.email,
    role: member.role,
    systemRole: member.systemRole,
    memberStatus: member.status,
    status: statusFor(member.status, member.legalAcceptances.length > 0, allCompliant),
    documents,
  };
}
