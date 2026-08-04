import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ensureReferralCode } from "@/features/referrals/services/referral-code";
import {
  requestOrConnectAgency,
  approveCreatorRequest,
  rejectCreatorRequest,
  getAgencyRequestStats,
  getPendingRequestsForAgency,
  getCreatorAgencyStatus,
  connectReferralOnApproval,
  createReferralLinkForApplication,
} from "@/features/referrals/services/referral.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let agencyId: string;
let agencyCode: string;

describe("Agency Approval workflow (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Agency Approval ${runId}`, slug: `test-org-agency-approval-${runId}` },
    });
    organizationId = org.id;

    const agency = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AA-AGY-${runId}`,
        fullName: "Nova Talent Agency",
        email: `nova-agy-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    agencyId = agency.id;
    agencyCode = (await ensureReferralCode(agencyId, "AGENCY"))!;
  });

  afterAll(async () => {
    await prisma.gMVTransaction.deleteMany({ where: { member: { organizationId } } });
    await prisma.notification.deleteMany({ where: { member: { organizationId } } });
    await prisma.referralLink.deleteMany({ where: { organizationId } });
    await prisma.membershipApplication.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("requestOrConnectAgency: QR_CODE/LINK sources connect immediately, no approval required", async () => {
    const creator = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AA-QR-${runId}`,
        fullName: "QR Creator",
        email: `qr-creator-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });

    const result = await requestOrConnectAgency(organizationId, creator.id, agencyCode, "LINK");
    expect(result).toEqual({ success: true, status: "CONNECTED", agencyName: "Nova Talent Agency" });

    const member = await prisma.member.findUniqueOrThrow({ where: { id: creator.id } });
    expect(member.referredByMemberId).toBe(agencyId);

    const status = await getCreatorAgencyStatus(organizationId, creator.id);
    expect(status).toEqual({ status: "CONNECTED", agencyId, agencyName: "Nova Talent Agency" });
  });

  it("requestOrConnectAgency: MANUAL_ENTRY creates a PENDING request, does not connect, and notifies the agency", async () => {
    const creator = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AA-MANUAL-${runId}`,
        fullName: "Manual Creator",
        email: `manual-creator-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });

    const result = await requestOrConnectAgency(organizationId, creator.id, agencyCode, "MANUAL_ENTRY");
    expect(result).toEqual({ success: true, status: "PENDING", agencyName: "Nova Talent Agency" });

    const member = await prisma.member.findUniqueOrThrow({ where: { id: creator.id } });
    expect(member.referredByMemberId).toBeNull();

    const status = await getCreatorAgencyStatus(organizationId, creator.id);
    expect(status).toEqual({ status: "PENDING", agencyName: "Nova Talent Agency" });

    const notification = await prisma.notification.findFirst({
      where: { memberId: agencyId, type: "AGENCY_REQUEST_RECEIVED" },
    });
    expect(notification).not.toBeNull();

    // A second manual request while one is already pending is rejected.
    const dupe = await requestOrConnectAgency(organizationId, creator.id, agencyCode, "MANUAL_ENTRY");
    expect(dupe.success).toBe(false);
  });

  it("approveCreatorRequest connects the creator, attributes future GMV, and notifies them", async () => {
    const creator = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AA-APPROVE-${runId}`,
        fullName: "Approved Creator",
        email: `approved-creator-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });
    await requestOrConnectAgency(organizationId, creator.id, agencyCode, "MANUAL_ENTRY");
    const link = await prisma.referralLink.findUniqueOrThrow({ where: { memberId: creator.id } });

    const result = await approveCreatorRequest(organizationId, link.id, agencyId);
    expect(result).toEqual({ success: true, creatorId: creator.id, creatorName: "Approved Creator", agencyName: "Nova Talent Agency" });

    const member = await prisma.member.findUniqueOrThrow({ where: { id: creator.id } });
    expect(member.referredByMemberId).toBe(agencyId);
    expect(member.referredByCode).toBe(agencyCode);

    const updatedLink = await prisma.referralLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(updatedLink.status).toBe("ACTIVE");
    expect(updatedLink.connectedAt).not.toBeNull();

    // GMV recorded after approval rolls into the agency's live aggregate.
    await prisma.gMVTransaction.create({ data: { memberId: creator.id, amount: 750, transactionDate: new Date() } });
    const stats = await prisma.gMVTransaction.aggregate({
      where: { member: { organizationId, referredByMemberId: agencyId } },
      _sum: { amount: true },
    });
    expect(Number(stats._sum.amount)).toBeGreaterThanOrEqual(750);

    const notification = await prisma.notification.findFirst({
      where: { memberId: creator.id, type: "AGENCY_REQUEST_APPROVED" },
    });
    expect(notification).not.toBeNull();

    // Approving again (already ACTIVE, not PENDING) fails cleanly.
    const reapprove = await approveCreatorRequest(organizationId, link.id, agencyId);
    expect(reapprove.success).toBe(false);
  });

  it("rejectCreatorRequest leaves the creator unlinked, notifies them, and allows a later request", async () => {
    const creator = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AA-REJECT-${runId}`,
        fullName: "Rejected Creator",
        email: `rejected-creator-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });
    await requestOrConnectAgency(organizationId, creator.id, agencyCode, "MANUAL_ENTRY");
    const link = await prisma.referralLink.findUniqueOrThrow({ where: { memberId: creator.id } });

    const result = await rejectCreatorRequest(organizationId, link.id, agencyId, "Not a fit right now");
    expect(result.success).toBe(true);

    const member = await prisma.member.findUniqueOrThrow({ where: { id: creator.id } });
    expect(member.referredByMemberId).toBeNull();

    const updatedLink = await prisma.referralLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(updatedLink.status).toBe("REJECTED");
    expect(updatedLink.memberId).toBeNull();
    expect(updatedLink.reviewNote).toBe("Not a fit right now");

    const status = await getCreatorAgencyStatus(organizationId, creator.id);
    expect(status).toEqual({ status: "NONE" });

    const notification = await prisma.notification.findFirst({
      where: { memberId: creator.id, type: "AGENCY_REQUEST_REJECTED" },
    });
    expect(notification).not.toBeNull();

    // "They may request a different agency" — a fresh request now succeeds.
    const retry = await requestOrConnectAgency(organizationId, creator.id, agencyCode, "MANUAL_ENTRY");
    expect(retry.success).toBe(true);
  });

  it("a request cannot be approved or rejected by a different agency (security)", async () => {
    const otherAgency = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AA-OTHERAGY-${runId}`,
        fullName: "Rival Agency",
        email: `rival-agy-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });

    const creator = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-AA-SECURITY-${runId}`,
        fullName: "Security Test Creator",
        email: `security-creator-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });
    await requestOrConnectAgency(organizationId, creator.id, agencyCode, "MANUAL_ENTRY");
    const link = await prisma.referralLink.findUniqueOrThrow({ where: { memberId: creator.id } });

    const approveAttempt = await approveCreatorRequest(organizationId, link.id, otherAgency.id);
    expect(approveAttempt.success).toBe(false);

    const rejectAttempt = await rejectCreatorRequest(organizationId, link.id, otherAgency.id);
    expect(rejectAttempt.success).toBe(false);

    // Unaffected by the failed attempts from the wrong agency.
    const stillPending = await prisma.referralLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(stillPending.status).toBe("PENDING");

    await prisma.referralLink.deleteMany({ where: { memberId: creator.id } });
    await prisma.member.delete({ where: { id: otherAgency.id } });
  });

  it("getAgencyRequestStats and getPendingRequestsForAgency reflect pending/approved/rejected counts", async () => {
    const stats = await getAgencyRequestStats(organizationId, agencyId);
    expect(stats.pending).toBeGreaterThanOrEqual(1);
    expect(stats.approvedThisMonth).toBeGreaterThanOrEqual(1);
    expect(stats.rejectedThisMonth).toBeGreaterThanOrEqual(1);

    const pending = await getPendingRequestsForAgency(organizationId, agencyId);
    expect(pending.every((r) => r.role === "CREATOR")).toBe(true);
    expect(pending.some((r) => r.fullName === "Rejected Creator")).toBe(true); // re-requested after rejection

    const searched = await getPendingRequestsForAgency(organizationId, agencyId, { search: "Rejected Creator" });
    expect(searched).toHaveLength(1);

    const noMatch = await getPendingRequestsForAgency(organizationId, agencyId, { search: "no-such-name-xyz" });
    expect(noMatch).toHaveLength(0);
  });

  it("connectReferralOnApproval: MANUAL_ENTRY via Apply stays pending until agency approval; QR/LINK still connects immediately", async () => {
    const manualApp = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Apply Manual", email: `apply-manual-${runId}@example.com`, phone: "5551110000", role: "CREATOR" },
    });
    await createReferralLinkForApplication(organizationId, manualApp.id, agencyCode, "MANUAL_ENTRY");
    const manualMember = await prisma.member.create({
      data: { organizationId, memberNumber: `TEST-AA-APPLYMANUAL-${runId}`, fullName: "Apply Manual", email: manualApp.email, role: "CREATOR", status: "ACTIVE" },
    });

    const manualLink = await connectReferralOnApproval(manualApp.id, manualMember.id);
    expect(manualLink!.status).toBe("PENDING");
    expect(manualLink!.memberId).toBe(manualMember.id);

    const manualMemberAfter = await prisma.member.findUniqueOrThrow({ where: { id: manualMember.id } });
    expect(manualMemberAfter.referredByMemberId).toBeNull();

    const status = await getCreatorAgencyStatus(organizationId, manualMember.id);
    expect(status).toEqual({ status: "PENDING", agencyName: "Nova Talent Agency" });

    const qrApp = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Apply QR", email: `apply-qr-${runId}@example.com`, phone: "5552220000", role: "CREATOR" },
    });
    await createReferralLinkForApplication(organizationId, qrApp.id, agencyCode, "QR_CODE");
    const qrMember = await prisma.member.create({
      data: { organizationId, memberNumber: `TEST-AA-APPLYQR-${runId}`, fullName: "Apply QR", email: qrApp.email, role: "CREATOR", status: "ACTIVE" },
    });

    const qrLink = await connectReferralOnApproval(qrApp.id, qrMember.id);
    expect(qrLink!.status).toBe("ACTIVE");

    const qrMemberAfter = await prisma.member.findUniqueOrThrow({ where: { id: qrMember.id } });
    expect(qrMemberAfter.referredByMemberId).toBe(agencyId);
  });
});
