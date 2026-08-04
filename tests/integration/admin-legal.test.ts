import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createDraft,
  updateDraft,
  deleteDraft,
  publishVersion,
  getCurrentVersion,
  getRequiredVersion,
} from "@/features/legal/services/legal-documents.service";
import {
  recordMemberLegalAcceptances,
  getOutstandingAcceptanceTypes,
  getMemberLegalAcceptances,
} from "@/features/legal/services/legal.service";
import {
  getComplianceSnapshot,
  getLegalDashboardKpis,
  getDocumentManagementCards,
  getMemberComplianceDetail,
} from "@/features/legal/services/compliance.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let memberId: string;
let founderId: string;

describe("admin legal dashboard (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Admin Legal ${runId}`, slug: `test-org-admin-legal-${runId}` },
    });
    organizationId = org.id;

    const founder = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AL-FOUNDER-${runId}`,
        fullName: "Founder Admin",
        email: `admin-legal-founder-${runId}@example.com`,
        role: "STAFF",
        systemRole: "SUPER_ADMIN",
      },
    });
    founderId = founder.id;

    const member = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AL-MEMBER-${runId}`,
        fullName: "Compliance Test Member",
        email: `admin-legal-member-${runId}@example.com`,
        role: "CREATOR",
      },
    });
    memberId = member.id;
  });

  afterAll(async () => {
    await prisma.legalAcceptance.deleteMany({ where: { memberId } });
    await prisma.legalDocumentVersion.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("creates a draft, publishes it as the first (MAJOR) version, and never overwrites prior rows", async () => {
    const draft = await createDraft(
      organizationId,
      "TERMS",
      {
        version: "1.0",
        title: "Terms & Conditions",
        summary: "Initial terms.",
        sections: [{ id: "intro", heading: "Introduction", body: ["Welcome."] }],
      },
      founderId
    );
    expect(draft.status).toBe("DRAFT");

    const published = await publishVersion(
      organizationId,
      draft.id,
      { kind: "MAJOR", effectiveDate: new Date("2026-01-01") },
      { id: founderId, fullName: "Founder Admin" }
    );
    expect(published.status).toBe("PUBLISHED");
    expect(published.versionKind).toBe("MAJOR");

    expect(await getCurrentVersion(organizationId, "TERMS")).toBe("1.0");
    expect(await getRequiredVersion(organizationId, "TERMS")).toBe("1.0");

    const allVersions = await prisma.legalDocumentVersion.findMany({ where: { organizationId, documentType: "TERMS" } });
    expect(allVersions).toHaveLength(1);
  }, 20000);

  it("only allows editing or deleting DRAFT rows, never PUBLISHED ones", async () => {
    const published = await prisma.legalDocumentVersion.findFirstOrThrow({
      where: { organizationId, documentType: "TERMS", status: "PUBLISHED" },
    });

    await expect(updateDraft(organizationId, published.id, { title: "Hacked" }, founderId)).rejects.toThrow(
      /only drafts can be edited/i
    );
    await expect(deleteDraft(organizationId, published.id, founderId)).rejects.toThrow(/only drafts can be deleted/i);
  });

  it("a member who accepts v1.0 is fully compliant", async () => {
    // Publishing MAJOR versions below fires real (no-op, unconfigured-provider)
    // email sends to every active member — slower than the default 5s timeout.
    await recordMemberLegalAcceptances(memberId, [
      { documentType: "TERMS", version: "1.0", accepted: true, acceptedAt: new Date(), ipAddress: "203.0.113.5", userAgent: "Vitest/1.0" },
      { documentType: "PRIVACY", version: "1.0", accepted: true, acceptedAt: new Date(), ipAddress: "203.0.113.5", userAgent: "Vitest/1.0" },
      { documentType: "DATA_PROCESSING", version: "1.0", accepted: true, acceptedAt: new Date(), ipAddress: "203.0.113.5", userAgent: "Vitest/1.0" },
      { documentType: "MEDIA_RELEASE", version: "1.0", accepted: true, acceptedAt: new Date(), ipAddress: "203.0.113.5", userAgent: "Vitest/1.0" },
      { documentType: "LIABILITY_RELEASE", version: "1.0", accepted: true, acceptedAt: new Date(), ipAddress: "203.0.113.5", userAgent: "Vitest/1.0" },
    ]);

    // Seed PRIVACY/MEDIA_RELEASE/LIABILITY_RELEASE published rows at v1.0 too, since
    // requiredVersionFor falls back to the seed registry otherwise and this test only
    // published TERMS above. Published MINOR (not MAJOR) purely to avoid firing the
    // real (if unconfigured) notify-and-email fan-out for a baseline seed version —
    // the MAJOR-triggers-notification behavior itself is covered separately below.
    for (const pageType of ["PRIVACY", "MEDIA_RELEASE", "LIABILITY_RELEASE"] as const) {
      const d = await createDraft(
        organizationId,
        pageType,
        { version: "1.0", title: pageType, summary: "s", sections: [{ id: "a", heading: "A", body: ["b"] }] },
        founderId
      );
      await publishVersion(organizationId, d.id, { kind: "MINOR" }, { id: founderId, fullName: "Founder Admin" });
    }

    const outstanding = await getOutstandingAcceptanceTypes(organizationId, memberId);
    expect(outstanding).toHaveLength(0);

    const snapshot = await getComplianceSnapshot(organizationId);
    const row = snapshot.find((r) => r.memberId === memberId)!;
    expect(row.status).toBe("COMPLIANT");
  }, 20000);

  it("a MINOR publish does not require re-acceptance — member stays compliant", async () => {
    const minorDraft = await createDraft(
      organizationId,
      "TERMS",
      { version: "1.1", title: "Terms & Conditions", summary: "Minor wording fix.", sections: [{ id: "intro", heading: "Introduction", body: ["Welcome (updated)."] }] },
      founderId
    );
    await publishVersion(organizationId, minorDraft.id, { kind: "MINOR" }, { id: founderId, fullName: "Founder Admin" });

    expect(await getCurrentVersion(organizationId, "TERMS")).toBe("1.1");
    expect(await getRequiredVersion(organizationId, "TERMS")).toBe("1.0"); // MINOR is skipped by getRequiredVersion

    const outstanding = await getOutstandingAcceptanceTypes(organizationId, memberId);
    expect(outstanding).toHaveLength(0);

    const view = await getMemberLegalAcceptances(organizationId, memberId);
    const terms = view.find((d) => d.documentType === "TERMS")!;
    expect(terms.isCompliant).toBe(true);
    expect(terms.isCurrent).toBe(false); // a newer version exists, informationally
  }, 20000);

  it("a MAJOR publish requires re-acceptance — member becomes non-compliant until they re-accept", async () => {
    const majorDraft = await createDraft(
      organizationId,
      "TERMS",
      { version: "2.0", title: "Terms & Conditions", summary: "Major rewrite.", sections: [{ id: "intro", heading: "Introduction", body: ["All new terms."] }] },
      founderId
    );
    await publishVersion(organizationId, majorDraft.id, { kind: "MAJOR" }, { id: founderId, fullName: "Founder Admin" });

    expect(await getCurrentVersion(organizationId, "TERMS")).toBe("2.0");
    expect(await getRequiredVersion(organizationId, "TERMS")).toBe("2.0");

    const outstanding = await getOutstandingAcceptanceTypes(organizationId, memberId);
    expect(outstanding).toContain("TERMS");

    const snapshot = await getComplianceSnapshot(organizationId);
    const row = snapshot.find((r) => r.memberId === memberId)!;
    expect(row.status).toBe("NEEDS_REACCEPTANCE");
    expect(row.documents.TERMS.compliant).toBe(false);

    const kpis = await getLegalDashboardKpis(organizationId);
    expect(kpis.needsReacceptance).toBeGreaterThanOrEqual(1);
    expect(kpis.documentVersions.find((d) => d.documentType === "TERMS")?.version).toBe("2.0");

    // Re-accepting the new version clears the outstanding requirement.
    await recordMemberLegalAcceptances(memberId, [
      { documentType: "TERMS", version: "2.0", accepted: true, acceptedAt: new Date(), ipAddress: "198.51.100.9", userAgent: "Vitest/2.0" },
    ]);
    expect(await getOutstandingAcceptanceTypes(organizationId, memberId)).not.toContain("TERMS");
  }, 20000);

  it("getDocumentManagementCards reports accurate current vs older version counts", async () => {
    const cards = await getDocumentManagementCards(organizationId);
    const termsCard = cards.find((c) => c.documentType === "TERMS")!;
    expect(termsCard.currentVersion).toBe("2.0");
    expect(termsCard.membersOnCurrentVersion).toBe(1);
    expect(termsCard.membersOnOlderVersion).toBe(0);
    expect(termsCard.totalAcceptances).toBe(1);
  });

  it("getMemberComplianceDetail exposes IP/user agent only when includeSensitive is true", async () => {
    const withSensitive = await getMemberComplianceDetail(organizationId, memberId, true);
    const withoutSensitive = await getMemberComplianceDetail(organizationId, memberId, false);

    const termsWith = withSensitive!.documents.find((d) => d.documentType === "TERMS")!;
    const termsWithout = withoutSensitive!.documents.find((d) => d.documentType === "TERMS")!;

    expect(termsWith.current?.ipAddress).toBe("198.51.100.9");
    expect(termsWithout.current?.ipAddress).toBeNull();
    expect(termsWith.original?.version).toBe("1.0"); // the first-ever TERMS acceptance
    expect(termsWith.current?.version).toBe("2.0"); // the latest acceptance, after re-accepting
  });
});
