import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { isLastSuperAdmin } from "@/lib/db/member-role-guards";

// isLastSuperAdmin is the DB-backed half of "CreatorHub360 must always have
// at least one Super Admin" (the other half, canManageMemberRole's
// self-change block, is pure and covered in tests/unit/member-rules.test.ts).
// It needs a real Postgres count query, so it's tested here rather than as a
// unit test — same real-Postgres convention as the other tests/integration
// files (see agency-uniqueness.test.ts).

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let soleSuperAdminId: string;
let secondSuperAdminId: string;
let regularMemberId: string;

describe("isLastSuperAdmin (last-Super-Admin protection, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Member Role Guards ${runId}`, slug: `test-org-member-role-guards-${runId}` },
    });
    organizationId = org.id;

    const soleSuperAdmin = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-MRG-SA1-${runId}`,
        fullName: "Sole Super Admin",
        email: `sole-super-admin-${runId}@example.com`,
        role: "STAFF",
        systemRole: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    soleSuperAdminId = soleSuperAdmin.id;

    const regularMember = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-MRG-MEM-${runId}`,
        fullName: "Regular Member",
        email: `regular-member-${runId}@example.com`,
        role: "CREATOR",
        systemRole: "MEMBER",
        status: "ACTIVE",
      },
    });
    regularMemberId = regularMember.id;
  });

  afterAll(async () => {
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("is true for the org's only Super Admin", async () => {
    expect(await isLastSuperAdmin(organizationId, soleSuperAdminId)).toBe(true);
  });

  it("is false once a second Super Admin exists — either could be demoted/removed safely", async () => {
    const secondSuperAdmin = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-MRG-SA2-${runId}`,
        fullName: "Second Super Admin",
        email: `second-super-admin-${runId}@example.com`,
        role: "STAFF",
        systemRole: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    secondSuperAdminId = secondSuperAdmin.id;

    expect(await isLastSuperAdmin(organizationId, soleSuperAdminId)).toBe(false);
    expect(await isLastSuperAdmin(organizationId, secondSuperAdminId)).toBe(false);
  });

  it("ignores a soft-deleted Super Admin — they no longer count toward the minimum", async () => {
    await prisma.member.update({ where: { id: secondSuperAdminId }, data: { deletedAt: new Date() } });
    expect(await isLastSuperAdmin(organizationId, soleSuperAdminId)).toBe(true);

    // Restore for isolation from any later test in this file/run.
    await prisma.member.update({ where: { id: secondSuperAdminId }, data: { deletedAt: null } });
  });

  it("is irrelevant to a non-Super-Admin — the caller only checks this for a SUPER_ADMIN target", async () => {
    // isLastSuperAdmin itself doesn't branch on the target's role — this
    // documents that the caller (updateMemberSystemRole/deleteMemberAction)
    // is responsible for only invoking it when target.systemRole === "SUPER_ADMIN".
    expect(await isLastSuperAdmin(organizationId, regularMemberId)).toBe(false);
  });
});
