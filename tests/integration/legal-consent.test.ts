import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  buildAcceptanceInputs,
  recordApplicationLegalAcceptances,
  recordMemberLegalAcceptances,
  materializeLegalAcceptancesForMember,
  getMemberLegalAcceptances,
  REQUIRED_ACCEPTANCE_TYPES,
} from "@/features/legal/services/legal.service";
import { getCurrentVersion } from "@/features/legal/services/legal-documents.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let applicationId: string;
let approvedMemberId: string;
let directMemberId: string;

const SUBMISSION_META = { ipAddress: "203.0.113.42", userAgent: "IntegrationTest/1.0" };
const SUBMITTED_AT = new Date("2026-07-30T09:00:00Z");

describe("legal consent capture (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org ${runId}`, slug: `test-org-legal-${runId}` },
    });
    organizationId = org.id;

    const application = await prisma.membershipApplication.create({
      data: {
        organizationId,
        fullName: "Legal Test Applicant",
        email: `legal-applicant-${runId}@example.com`,
        phone: "5559990000",
        role: "CREATOR",
      },
    });
    applicationId = application.id;

    const approvedMember = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-LEGAL-A-${runId}`,
        fullName: "Approved Test Member",
        email: `legal-approved-${runId}@example.com`,
        role: "CREATOR",
      },
    });
    approvedMemberId = approvedMember.id;

    const directMember = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-LEGAL-D-${runId}`,
        fullName: "Direct Signup Test Member",
        email: `legal-direct-${runId}@example.com`,
        role: "STAFF",
      },
    });
    directMemberId = directMember.id;
  });

  afterAll(async () => {
    await prisma.legalAcceptance.deleteMany({ where: { memberId: { in: [approvedMemberId, directMemberId] } } });
    await prisma.membershipApplicationLegalAcceptance.deleteMany({ where: { applicationId } });
    await prisma.membershipApplication.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("records all 5 acceptances against the application at submission time", async () => {
    const inputs = await buildAcceptanceInputs(organizationId, SUBMISSION_META, SUBMITTED_AT);
    await recordApplicationLegalAcceptances(applicationId, inputs);

    const rows = await prisma.membershipApplicationLegalAcceptance.findMany({ where: { applicationId } });
    expect(rows).toHaveLength(REQUIRED_ACCEPTANCE_TYPES.length);
    for (const type of REQUIRED_ACCEPTANCE_TYPES) {
      const row = rows.find((r) => r.documentType === type);
      expect(row, `missing row for ${type}`).toBeDefined();
      expect(row?.version).toBe(await getCurrentVersion(organizationId, type));
      expect(row?.accepted).toBe(true);
      expect(row?.ipAddress).toBe(SUBMISSION_META.ipAddress);
      expect(row?.userAgent).toBe(SUBMISSION_META.userAgent);
      expect(row?.acceptedAt.toISOString()).toBe(SUBMITTED_AT.toISOString());
    }
  });

  it("materializes the application's acceptances onto the Member at approval, preserving the original timestamp/IP/UA", async () => {
    await materializeLegalAcceptancesForMember(applicationId, approvedMemberId);

    const rows = await prisma.legalAcceptance.findMany({ where: { memberId: approvedMemberId } });
    expect(rows).toHaveLength(REQUIRED_ACCEPTANCE_TYPES.length);
    for (const type of REQUIRED_ACCEPTANCE_TYPES) {
      const row = rows.find((r) => r.documentType === type);
      expect(row?.version).toBe(await getCurrentVersion(organizationId, type));
      expect(row?.ipAddress).toBe(SUBMISSION_META.ipAddress);
      expect(row?.userAgent).toBe(SUBMISSION_META.userAgent);
      // The approval happens "now" in this test, well after SUBMITTED_AT --
      // materialization must carry over the original submission moment, not
      // stamp a fresh one.
      expect(row?.acceptedAt.toISOString()).toBe(SUBMITTED_AT.toISOString());
    }
  });

  it("is idempotent if called twice for the same application (unique constraint + skipDuplicates)", async () => {
    await materializeLegalAcceptancesForMember(applicationId, approvedMemberId);
    const rows = await prisma.legalAcceptance.findMany({ where: { memberId: approvedMemberId } });
    expect(rows).toHaveLength(REQUIRED_ACCEPTANCE_TYPES.length);
  });

  it("records acceptances directly against a Member for the invite-based signup path", async () => {
    const now = new Date();
    const inputs = await buildAcceptanceInputs(
      organizationId,
      { ipAddress: "198.51.100.9", userAgent: "DirectSignup/1.0" },
      now
    );
    await recordMemberLegalAcceptances(directMemberId, inputs);

    const rows = await prisma.legalAcceptance.findMany({ where: { memberId: directMemberId } });
    expect(rows).toHaveLength(REQUIRED_ACCEPTANCE_TYPES.length);
    expect(rows.every((r) => r.ipAddress === "198.51.100.9")).toBe(true);
  });

  it("getMemberLegalAcceptances reports every required document as accepted and current", async () => {
    const view = await getMemberLegalAcceptances(organizationId, approvedMemberId);
    expect(view).toHaveLength(REQUIRED_ACCEPTANCE_TYPES.length);
    for (const doc of view) {
      expect(doc.acceptedAt).not.toBeNull();
      expect(doc.acceptedVersion).toBe(doc.currentVersion);
      expect(doc.isCurrent).toBe(true);
    }
  });

  it("getMemberLegalAcceptances flags a stale acceptance whose version no longer matches the published one", async () => {
    // A member whose only Terms acceptance is for a version that's since
    // been superseded — simulating what happens after a real revision
    // bumps LEGAL_DOCUMENTS.TERMS.version without this member re-consenting.
    const staleMember = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-LEGAL-S-${runId}`,
        fullName: "Stale Consent Test Member",
        email: `legal-stale-${runId}@example.com`,
        role: "STAFF",
      },
    });

    await prisma.legalAcceptance.create({
      data: {
        memberId: staleMember.id,
        documentType: "TERMS",
        version: "0.9-superseded",
        acceptedAt: new Date("2020-01-01T00:00:00Z"),
      },
    });

    const view = await getMemberLegalAcceptances(organizationId, staleMember.id);
    const terms = view.find((d) => d.documentType === "TERMS");
    expect(terms?.acceptedVersion).toBe("0.9-superseded");
    expect(terms?.isCurrent).toBe(false);

    await prisma.member.delete({ where: { id: staleMember.id } });
  });

  it("getMemberLegalAcceptances reports not-accepted for a member with no acceptance rows", async () => {
    const untouchedMember = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-LEGAL-U-${runId}`,
        fullName: "No Consent Test Member",
        email: `legal-none-${runId}@example.com`,
        role: "STAFF",
      },
    });

    const view = await getMemberLegalAcceptances(organizationId, untouchedMember.id);
    expect(view.every((d) => d.acceptedAt === null && d.acceptedVersion === null && d.isCurrent === false)).toBe(
      true
    );

    await prisma.member.delete({ where: { id: untouchedMember.id } });
  });
});
