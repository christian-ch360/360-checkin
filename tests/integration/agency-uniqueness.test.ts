import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ensureReferralCode } from "@/features/referrals/services/referral-code";
import { requestOrConnectAgency } from "@/features/referrals/services/referral.service";
import {
  checkAgencyDuplicate,
  mergeAgencies,
} from "@/features/agencies/services/agency-duplicate.service";
import { submitApplication } from "@/features/applications/services/applications.service";
import { AgencyDuplicateError } from "@/features/agencies/services/agency-duplicate.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let existingAgencyId: string;

describe("Agency Uniqueness (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Agency Uniqueness ${runId}`, slug: `test-org-agency-uniqueness-${runId}` },
    });
    organizationId = org.id;

    const agency = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AU-AGY-${runId}`,
        fullName: "Bright Star Talent",
        email: `bright-star-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
        website: "https://www.brightstartalent.com/home",
        businessRegistrationNumber: "EIN-778899",
      },
    });
    existingAgencyId = agency.id;
    await ensureReferralCode(existingAgencyId, "AGENCY");
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { member: { organizationId } } });
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    await prisma.referralLink.deleteMany({ where: { organizationId } });
    await prisma.membershipApplication.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("detects a duplicate by business name (case/whitespace-insensitive)", async () => {
    const result = await checkAgencyDuplicate(organizationId, "AGENCY", { businessName: "  bright star   talent " });
    expect(result.duplicate).toBe(true);
    if (result.duplicate) {
      expect(result.matches[0].field).toBe("name");
      expect(result.matches[0].existingAgency.id).toBe(existingAgencyId);
    }
  });

  it("detects a duplicate by website domain regardless of protocol/www/path", async () => {
    const result = await checkAgencyDuplicate(organizationId, "AGENCY", {
      businessName: "Totally Different Name",
      website: "brightstartalent.com/about-us",
    });
    expect(result.duplicate).toBe(true);
    if (result.duplicate) expect(result.matches.some((m) => m.field === "website")).toBe(true);
  });

  it("detects a duplicate by business registration number", async () => {
    const result = await checkAgencyDuplicate(organizationId, "AGENCY", {
      businessName: "Another Totally Different Name",
      businessRegistrationNumber: "ein-778899",
    });
    expect(result.duplicate).toBe(true);
    if (result.duplicate) expect(result.matches.some((m) => m.field === "registration")).toBe(true);
  });

  it("does not flag a genuinely different agency", async () => {
    const result = await checkAgencyDuplicate(organizationId, "AGENCY", {
      businessName: "Completely Unrelated Agency",
      website: "unrelated-agency.io",
      businessRegistrationNumber: "EIN-000000",
    });
    expect(result.duplicate).toBe(false);
  });

  it("no-ops for non-referral-eligible roles", async () => {
    const result = await checkAgencyDuplicate(organizationId, "CREATOR", { businessName: "Bright Star Talent" });
    expect(result.duplicate).toBe(false);
  });

  it("excludeMemberId lets a member's own record not collide with itself", async () => {
    const result = await checkAgencyDuplicate(
      organizationId,
      "AGENCY",
      { businessName: "Bright Star Talent" },
      existingAgencyId
    );
    expect(result.duplicate).toBe(false);
  });

  it("submitApplication rejects a duplicate AGENCY application before creating any row", async () => {
    // submitApplication always resolves the single default org (oldest by
    // createdAt) rather than taking one explicitly — a real architectural
    // constraint of this single-tenant codebase — so the fixture has to live
    // in that same org, not the scoped test org used elsewhere in this file.
    // Cleanup removes only the exact rows this test creates, never the org.
    const defaultOrg = await prisma.organization.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
    const uniqueName = `Submit-Dup Test Agency ${runId}`;

    const fixtureAgency = await prisma.member.create({
      data: {
        organizationId: defaultOrg.id,
        memberNumber: `TEST-AU-SUBMITDUP-${runId}`,
        fullName: uniqueName,
        email: `submit-dup-fixture-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });

    try {
      const before = await prisma.membershipApplication.count({ where: { organizationId: defaultOrg.id, email: `dup-agency-${runId}@example.com` } });

      await expect(
        submitApplication({
          fullName: "Some Applicant",
          email: `dup-agency-${runId}@example.com`,
          phone: "5559998888",
          role: "AGENCY",
          company: uniqueName,
          instagram: "somehandle",
          tiktok: "somehandle",
          youtube: "",
          city: "Austin",
          state: "TX",
          country: "USA",
          reason: "We would love to partner with CreatorHub360 for our roster of creators.",
          referredBy: "No Referral",
          referralCode: "",
          termsAccepted: true,
          privacyAccepted: true,
          dataProcessingAccepted: true,
          mediaReleaseAccepted: true,
        })
      ).rejects.toThrow(AgencyDuplicateError);

      const after = await prisma.membershipApplication.count({ where: { organizationId: defaultOrg.id, email: `dup-agency-${runId}@example.com` } });
      expect(after).toBe(before);
    } finally {
      await prisma.membershipApplication.deleteMany({ where: { email: `dup-agency-${runId}@example.com` } });
      await prisma.member.delete({ where: { id: fixtureAgency.id } });
    }
  });

  it("mergeAgencies reassigns connected creators + pending requests, soft-deletes the duplicate, and audit-logs it", async () => {
    const primary = existingAgencyId;
    const primaryCode = await prisma.member.findUniqueOrThrow({ where: { id: primary }, select: { referralCode: true } });

    const duplicate = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AU-DUP-${runId}`,
        fullName: "Bright Star Talent (Duplicate)",
        email: `bright-star-dup-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    const duplicateCode = await ensureReferralCode(duplicate.id, "AGENCY");

    const connectedCreator = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AU-CONN-${runId}`,
        fullName: "Connected Creator",
        email: `connected-creator-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });
    await requestOrConnectAgency(organizationId, connectedCreator.id, duplicateCode!, "LINK");

    const pendingCreator = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AU-PEND-${runId}`,
        fullName: "Pending Creator",
        email: `pending-creator-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });
    await requestOrConnectAgency(organizationId, pendingCreator.id, duplicateCode!, "MANUAL_ENTRY");

    const superAdmin = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AU-SA-${runId}`,
        fullName: "Super Admin",
        email: `super-admin-${runId}@example.com`,
        role: "STAFF",
        systemRole: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });

    const result = await mergeAgencies(organizationId, primary, duplicate.id, superAdmin.id);
    expect(result.success).toBe(true);

    const mergedDuplicate = await prisma.member.findUniqueOrThrow({ where: { id: duplicate.id } });
    expect(mergedDuplicate.deletedAt).not.toBeNull();

    const connectedAfter = await prisma.member.findUniqueOrThrow({ where: { id: connectedCreator.id } });
    expect(connectedAfter.referredByMemberId).toBe(primary);
    expect(connectedAfter.referredByCode).toBe(primaryCode.referralCode);

    const pendingLink = await prisma.referralLink.findUniqueOrThrow({ where: { memberId: pendingCreator.id } });
    expect(pendingLink.referrerMemberId).toBe(primary);
    expect(pendingLink.status).toBe("PENDING");

    const auditEntry = await prisma.auditLog.findFirst({
      where: { organizationId, action: "agency.merged", entityId: primary },
    });
    expect(auditEntry).not.toBeNull();
    expect((auditEntry!.before as { duplicateAgencyId: string }).duplicateAgencyId).toBe(duplicate.id);
  }, 20000);

  it("mergeAgencies rejects merging an agency into itself, and rejects unknown records", async () => {
    const selfMerge = await mergeAgencies(organizationId, existingAgencyId, existingAgencyId, existingAgencyId);
    expect(selfMerge.success).toBe(false);

    const unknownPrimary = await mergeAgencies(organizationId, "00000000-0000-0000-0000-000000000000", existingAgencyId, existingAgencyId);
    expect(unknownPrimary.success).toBe(false);
  });
});
