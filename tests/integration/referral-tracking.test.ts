import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ensureReferralCode } from "@/features/referrals/services/referral-code";
import {
  validateReferralCode,
  createReferralLinkForApplication,
  connectReferralOnApproval,
  getAgencyDashboardData,
  listReferralsForAgency,
  transferReferral,
  getReferralLeaderboard,
} from "@/features/referrals/services/referral.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let agencyId: string;
let secondAgencyId: string;
let applicationId: string;

describe("Agency ID + QR referral tracking (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Referrals ${runId}`, slug: `test-org-referrals-${runId}` },
    });
    organizationId = org.id;

    const agency = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-REF-AGY-${runId}`,
        fullName: "Influence Management Group",
        email: `agency-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    agencyId = agency.id;

    const secondAgency = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-REF-AGY2-${runId}`,
        fullName: "Second Agency Group",
        email: `agency2-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
      },
    });
    secondAgencyId = secondAgency.id;

    const application = await prisma.membershipApplication.create({
      data: {
        organizationId,
        fullName: "Referred Creator",
        email: `creator-${runId}@example.com`,
        phone: "5559990000",
        role: "CREATOR",
      },
    });
    applicationId = application.id;
  });

  afterAll(async () => {
    await prisma.gMVTransaction.deleteMany({ where: { member: { organizationId } } });
    await prisma.referralLink.deleteMany({ where: { organizationId } });
    await prisma.membershipApplication.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("ensureReferralCode mints a permanent, unique AGY- code and is idempotent", async () => {
    const code = await ensureReferralCode(agencyId, "AGENCY");
    expect(code).toMatch(/^AGY-\d{6}$/);

    const again = await ensureReferralCode(agencyId, "AGENCY");
    expect(again).toBe(code);

    const stored = await prisma.member.findUniqueOrThrow({ where: { id: agencyId }, select: { referralCode: true } });
    expect(stored.referralCode).toBe(code);
  });

  it("ensureReferralCode no-ops for non-referral-eligible roles", async () => {
    const creator = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-REF-NOTELIGIBLE-${runId}`,
        fullName: "Not Eligible",
        email: `not-eligible-${runId}@example.com`,
        role: "CREATOR",
      },
    });
    const code = await ensureReferralCode(creator.id, "CREATOR");
    expect(code).toBeNull();
    await prisma.member.delete({ where: { id: creator.id } });
  });

  it("validateReferralCode accepts a real active agency and rejects unknown/inactive ones", async () => {
    const agency = await prisma.member.findUniqueOrThrow({ where: { id: agencyId }, select: { referralCode: true } });
    const valid = await validateReferralCode(organizationId, agency.referralCode!);
    expect(valid).toEqual({ valid: true, referrerId: agencyId, referrerName: "Influence Management Group", referrerRole: "AGENCY" });

    const unknown = await validateReferralCode(organizationId, "AGY-999999");
    expect(unknown.valid).toBe(false);

    await prisma.member.update({ where: { id: agencyId }, data: { status: "SUSPENDED" } });
    const inactive = await validateReferralCode(organizationId, agency.referralCode!);
    expect(inactive.valid).toBe(false);
    await prisma.member.update({ where: { id: agencyId }, data: { status: "ACTIVE" } });
  });

  it("createReferralLinkForApplication creates a PENDING link, and silently no-ops on an invalid code", async () => {
    const agency = await prisma.member.findUniqueOrThrow({ where: { id: agencyId }, select: { referralCode: true } });

    const link = await createReferralLinkForApplication(organizationId, applicationId, agency.referralCode!, "QR_CODE");
    expect(link).not.toBeNull();
    expect(link!.status).toBe("PENDING");
    expect(link!.referrerMemberId).toBe(agencyId);
    expect(link!.source).toBe("QR_CODE");

    const junk = await createReferralLinkForApplication(organizationId, applicationId, "AGY-000000", "MANUAL_ENTRY");
    expect(junk).toBeNull();
  });

  it("connectReferralOnApproval links the newly-created Member to the agency and activates the ReferralLink", async () => {
    const newMember = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-REF-CREATOR-${runId}`,
        fullName: "Referred Creator",
        email: `creator-approved-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });

    const updatedLink = await connectReferralOnApproval(applicationId, newMember.id);
    expect(updatedLink).not.toBeNull();
    expect(updatedLink!.status).toBe("ACTIVE");
    expect(updatedLink!.memberId).toBe(newMember.id);
    expect(updatedLink!.connectedAt).not.toBeNull();

    const member = await prisma.member.findUniqueOrThrow({ where: { id: newMember.id } });
    expect(member.referredByMemberId).toBe(agencyId);
    expect(member.referredByCode).toMatch(/^AGY-\d{6}$/);
  });

  it("GMV recorded for a connected creator automatically rolls up into the agency's dashboard — no manual step", async () => {
    const creator = await prisma.member.findFirstOrThrow({ where: { organizationId, referredByMemberId: agencyId } });

    await prisma.gMVTransaction.create({
      data: { memberId: creator.id, amount: 1500, transactionDate: new Date() },
    });
    // Also bump the creator's own currentGMV rollup, which topPerformingCreator ranks by
    // (mirrors how the rest of the app maintains this field).
    await prisma.member.update({ where: { id: creator.id }, data: { currentGMV: 1500 } });

    const dashboard = await getAgencyDashboardData(organizationId, agencyId);
    expect(dashboard).not.toBeNull();
    expect(dashboard!.connectedCreators).toHaveLength(1);
    expect(dashboard!.lifetimeGMV).toBe(1500);
    expect(dashboard!.monthlyGMV).toBe(1500);
    expect(dashboard!.pendingCreatorRequests).toBe(0); // the one application was already approved
    expect(dashboard!.topPerformingCreator?.id).toBe(creator.id);
    expect(dashboard!.topPerformingCreator?.currentGMV).toBe(1500);

    const history = await listReferralsForAgency(organizationId, agencyId);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].status).toBe("ACTIVE");
  });

  it("transferReferral (Super Admin authorized) reassigns the creator and preserves history instead of overwriting it", async () => {
    const creator = await prisma.member.findFirstOrThrow({ where: { organizationId, referredByMemberId: agencyId } });
    const secondAgency = await prisma.member.findUniqueOrThrow({
      where: { id: secondAgencyId },
      select: { referralCode: true },
    });
    const secondCode = secondAgency.referralCode ?? (await ensureReferralCode(secondAgencyId, "AGENCY"));

    const result = await transferReferral({
      organizationId,
      memberId: creator.id,
      newReferralCode: secondCode,
    });
    expect(result.success).toBe(true);

    const updatedMember = await prisma.member.findUniqueOrThrow({ where: { id: creator.id } });
    expect(updatedMember.referredByMemberId).toBe(secondAgencyId);
    expect(updatedMember.referredByCode).toBe(secondCode);

    // The original link is preserved (TRANSFERRED, memberId cleared) rather than deleted/overwritten.
    const oldLinks = await prisma.referralLink.findMany({
      where: { organizationId, referrerMemberId: agencyId, applicationId },
    });
    expect(oldLinks).toHaveLength(1);
    expect(oldLinks[0].status).toBe("TRANSFERRED");
    expect(oldLinks[0].memberId).toBeNull();

    const newLink = await prisma.referralLink.findUnique({ where: { memberId: creator.id } });
    expect(newLink?.referrerMemberId).toBe(secondAgencyId);
    expect(newLink?.status).toBe("ACTIVE");

    // The old agency's dashboard no longer shows this creator as connected.
    const oldAgencyDashboard = await getAgencyDashboardData(organizationId, agencyId);
    expect(oldAgencyDashboard!.connectedCreators.find((c) => c.id === creator.id)).toBeUndefined();
  });

  it("transferReferral rejects an unknown/invalid new referral code without changing anything", async () => {
    const creator = await prisma.member.findFirstOrThrow({ where: { organizationId, referredByMemberId: secondAgencyId } });
    const before = await prisma.member.findUniqueOrThrow({ where: { id: creator.id }, select: { referredByMemberId: true } });

    const result = await transferReferral({ organizationId, memberId: creator.id, newReferralCode: "AGY-000000" });
    expect(result.success).toBe(false);

    const after = await prisma.member.findUniqueOrThrow({ where: { id: creator.id }, select: { referredByMemberId: true } });
    expect(after.referredByMemberId).toBe(before.referredByMemberId);
  });

  it("getReferralLeaderboard ranks agencies by their referred creators' GMV", async () => {
    const leaderboard = await getReferralLeaderboard(organizationId, "AGENCY");
    const secondAgencyEntry = leaderboard.find((e) => e.id === secondAgencyId);
    expect(secondAgencyEntry).toBeDefined();
    expect(secondAgencyEntry!.gmv).toBe(1500);
    expect(secondAgencyEntry!.creatorCount).toBe(1);
  });
});
