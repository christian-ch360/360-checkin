import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ensureReferralCode } from "@/features/referrals/services/referral-code";
import {
  requestAgencyAccess,
  approveAgencyAccessRequest,
  rejectAgencyAccessRequest,
  overrideAgencyAccess,
  getPendingAccessRequestsForAgency,
  getAgencyTeam,
  isAgencyAdmin,
} from "@/features/agencies/services/agency-access.service";
import { checkAgencyDuplicate } from "@/features/agencies/services/agency-duplicate.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let canonicalAgencyId: string;

describe("Existing Agency Claim Workflow (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Agency Claim ${runId}`, slug: `test-org-agency-claim-${runId}` },
    });
    organizationId = org.id;

    const agency = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AC-AGY-${runId}`,
        fullName: "Stellar Creator Agency",
        email: `stellar-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    canonicalAgencyId = agency.id;
    await ensureReferralCode(canonicalAgencyId, "AGENCY");
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { member: { organizationId } } });
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    await prisma.agencyAccessRequest.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("requestAgencyAccess creates a PENDING request and notifies the agency's admins, without granting access yet", async () => {
    const requester = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AC-REQ1-${runId}`,
        fullName: "Jamie Requester",
        email: `jamie-requester-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });

    const result = await requestAgencyAccess(organizationId, canonicalAgencyId, requester.id, "STAFF");
    expect(result).toEqual({ success: true, agencyName: "Stellar Creator Agency" });

    const memberAfter = await prisma.member.findUniqueOrThrow({ where: { id: requester.id } });
    expect(memberAfter.agencyId).toBeNull();
    expect(memberAfter.agencyRole).toBeNull();

    const notification = await prisma.notification.findFirst({
      where: { memberId: canonicalAgencyId, type: "AGENCY_ACCESS_REQUESTED" },
    });
    expect(notification).not.toBeNull();

    // A second request while one is pending is rejected.
    const dupe = await requestAgencyAccess(organizationId, canonicalAgencyId, requester.id, "MANAGER");
    expect(dupe.success).toBe(false);
  }, 20000);

  it("approveAgencyAccessRequest grants access without minting a new Agency ID", async () => {
    const requester = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AC-APPROVE-${runId}`,
        fullName: "Approved Teammate",
        email: `approved-teammate-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    await requestAgencyAccess(organizationId, canonicalAgencyId, requester.id, "MANAGER");
    const request = await prisma.agencyAccessRequest.findUniqueOrThrow({ where: { requesterId: requester.id } });

    const result = await approveAgencyAccessRequest(organizationId, request.id, canonicalAgencyId);
    expect(result).toEqual({
      success: true,
      requesterId: requester.id,
      requesterName: "Approved Teammate",
      agencyName: "Stellar Creator Agency",
    });

    const memberAfter = await prisma.member.findUniqueOrThrow({ where: { id: requester.id } });
    expect(memberAfter.agencyId).toBe(canonicalAgencyId);
    expect(memberAfter.agencyRole).toBe("MANAGER");
    // "They do not receive a new Agency ID."
    expect(memberAfter.referralCode).toBeNull();

    const notification = await prisma.notification.findFirst({
      where: { memberId: requester.id, type: "AGENCY_ACCESS_APPROVED" },
    });
    expect(notification).not.toBeNull();

    const team = await getAgencyTeam(organizationId, canonicalAgencyId);
    expect(team.some((m) => m.id === requester.id && m.role === "MANAGER")).toBe(true);
    expect(team.some((m) => m.id === canonicalAgencyId && m.isCanonical)).toBe(true);

    expect(isAgencyAdmin(memberAfter, canonicalAgencyId)).toBe(true);
  }, 20000);

  it("rejectAgencyAccessRequest grants no access and records the note", async () => {
    const requester = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AC-REJECT-${runId}`,
        fullName: "Rejected Applicant",
        email: `rejected-applicant-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    await requestAgencyAccess(organizationId, canonicalAgencyId, requester.id, "STAFF");
    const request = await prisma.agencyAccessRequest.findUniqueOrThrow({ where: { requesterId: requester.id } });

    const result = await rejectAgencyAccessRequest(organizationId, request.id, canonicalAgencyId, "Not a fit");
    expect(result.success).toBe(true);

    const memberAfter = await prisma.member.findUniqueOrThrow({ where: { id: requester.id } });
    expect(memberAfter.agencyId).toBeNull();

    const updatedRequest = await prisma.agencyAccessRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updatedRequest.status).toBe("REJECTED");
    expect(updatedRequest.reviewNote).toBe("Not a fit");

    const notification = await prisma.notification.findFirst({
      where: { memberId: requester.id, type: "AGENCY_ACCESS_REJECTED" },
    });
    expect(notification).not.toBeNull();
  }, 20000);

  it("a request can only be approved/rejected by that agency's own admins, not an unrelated agency", async () => {
    const otherAgency = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AC-OTHERAGY-${runId}`,
        fullName: "Rival Agency",
        email: `rival-agy-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    const requester = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AC-SECURITY-${runId}`,
        fullName: "Security Test Requester",
        email: `security-requester-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    await requestAgencyAccess(organizationId, canonicalAgencyId, requester.id, "STAFF");
    const request = await prisma.agencyAccessRequest.findUniqueOrThrow({ where: { requesterId: requester.id } });

    // approveAgencyAccessRequest/rejectAgencyAccessRequest are scoped by agencyId in the query
    // itself — passing the wrong agency's id finds nothing to act on.
    const approveAttempt = await approveAgencyAccessRequest(organizationId, request.id, otherAgency.id);
    expect(approveAttempt.success).toBe(false);
    const rejectAttempt = await rejectAgencyAccessRequest(organizationId, request.id, otherAgency.id);
    expect(rejectAttempt.success).toBe(false);

    const stillPending = await prisma.agencyAccessRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(stillPending.status).toBe("PENDING");

    await prisma.member.delete({ where: { id: otherAgency.id } });
  }, 20000);

  it("overrideAgencyAccess (Super Admin) grants access directly and audit-logs distinctly", async () => {
    const requester = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AC-OVERRIDE-${runId}`,
        fullName: "Override Target",
        email: `override-target-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    const superAdmin = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AC-SA-${runId}`,
        fullName: "Super Admin",
        email: `super-admin-${runId}@example.com`,
        role: "STAFF",
        systemRole: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });

    const result = await overrideAgencyAccess(organizationId, requester.id, canonicalAgencyId, "OWNER", superAdmin.id);
    expect(result.success).toBe(true);

    const memberAfter = await prisma.member.findUniqueOrThrow({ where: { id: requester.id } });
    expect(memberAfter.agencyId).toBe(canonicalAgencyId);
    expect(memberAfter.agencyRole).toBe("OWNER");

    const auditEntry = await prisma.auditLog.findFirst({
      where: { organizationId, action: "agency.access_overridden", entityId: requester.id },
    });
    expect(auditEntry).not.toBeNull();
  }, 20000);

  it("checkAgencyDuplicate never flags a team member as a competing agency record", async () => {
    // "Approved Teammate" from an earlier test now has agencyId set — should not appear as a
    // separate duplicate match even though their fullName differs from the canonical agency.
    const result = await checkAgencyDuplicate(organizationId, "AGENCY", { businessName: "Approved Teammate" });
    expect(result.duplicate).toBe(false);
  });

  it("getPendingAccessRequestsForAgency reflects only PENDING requests for that agency", async () => {
    const pending = await getPendingAccessRequestsForAgency(organizationId, canonicalAgencyId);
    expect(pending.every((r) => r.role !== undefined)).toBe(true);
    expect(pending.some((r) => r.fullName === "Security Test Requester")).toBe(true);
    expect(pending.some((r) => r.fullName === "Approved Teammate")).toBe(false);
    expect(pending.some((r) => r.fullName === "Rejected Applicant")).toBe(false);
  });
});
