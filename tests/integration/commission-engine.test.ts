import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { recordGMVAndCommission } from "@/features/commissions/services/commission-engine";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let tierId: string;
let memberId: string;
let projectId: string;

describe("commission engine (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org ${runId}`, slug: `test-org-${runId}` },
    });
    organizationId = org.id;

    const tier = await prisma.commissionTier.create({
      data: { organizationId, code: "A", name: "Tier A", percentage: 12 },
    });
    tierId = tier.id;

    const member = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-${runId}`,
        fullName: "Test Creator",
        email: `test-creator-${runId}@example.com`,
        role: "CREATOR",
        commissionTierId: tierId,
      },
    });
    memberId = member.id;

    const project = await prisma.project.create({
      data: {
        organizationId,
        projectCode: `TEST-PRJ-${runId}`,
        name: "Test Project",
        status: "ACTIVE",
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.commissionTransaction.deleteMany({ where: { memberId } });
    await prisma.gMVTransaction.deleteMany({ where: { memberId } });
    await prisma.project.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.commissionTier.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("calculates commission at the member's tier rate and updates running totals", async () => {
    const { gmvTransaction, commissionTransaction } = await recordGMVAndCommission({
      organizationId,
      memberId,
      amount: 1000,
      projectId,
      recordedByMemberId: memberId,
    });

    expect(Number(gmvTransaction.amount)).toBe(1000);
    expect(commissionTransaction).not.toBeNull();
    expect(commissionTransaction?.tierCode).toBe("A");
    expect(Number(commissionTransaction?.commissionAmount)).toBe(120);
    expect(Number(commissionTransaction?.remainingMargin)).toBe(880);

    const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    expect(Number(member.currentGMV)).toBe(1000);
    expect(Number(member.currentCommission)).toBe(120);

    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(Number(project.gmv)).toBe(1000);
    expect(Number(project.commissionPool)).toBe(120);
  });

  it("accumulates totals across multiple GMV entries", async () => {
    await recordGMVAndCommission({
      organizationId,
      memberId,
      amount: 500,
      projectId,
      recordedByMemberId: memberId,
    });

    const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    // Prior test recorded 1000; this test adds 500 more.
    expect(Number(member.currentGMV)).toBe(1500);
    expect(Number(member.currentCommission)).toBe(180); // 120 + 60
  });

  it("skips commission generation when the member has no assigned tier", async () => {
    const untiered = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-NOTIER-${runId}`,
        fullName: "No Tier Member",
        email: `no-tier-${runId}@example.com`,
        role: "CREATOR",
      },
    });

    const { commissionTransaction } = await recordGMVAndCommission({
      organizationId,
      memberId: untiered.id,
      amount: 250,
      recordedByMemberId: untiered.id,
    });

    expect(commissionTransaction).toBeNull();

    const member = await prisma.member.findUniqueOrThrow({ where: { id: untiered.id } });
    expect(Number(member.currentGMV)).toBe(250);
    expect(Number(member.currentCommission)).toBe(0);
  });
});
