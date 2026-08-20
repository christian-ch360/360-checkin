import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateMemberNumber, isUniqueConstraintError, isUniqueConstraintErrorOnField } from "@/features/members/services/member-number";

const prisma = new PrismaClient();
const runId = Date.now();
let organizationId: string;
const createdMemberIds: string[] = [];

/**
 * Covers the production incident: member.count()+1 recomputed an
 * already-taken memberNumber (CH360-000132) once any member had ever been
 * deleted, and every retry recomputed the identical colliding number since
 * count() doesn't change between failed attempts. Fixed by switching to the
 * member_number_seq Postgres sequence (20260820020000_member_number_sequence)
 * — these tests exercise the real sequence against real Postgres, and the
 * error-classification logic (isUniqueConstraintErrorOnField) that
 * approveApplicationAction relies on to never mislabel a memberNumber
 * collision as an email collision. approveApplicationAction itself isn't
 * called directly (needs a real authenticated session — see every other
 * integration test in this codebase for the same convention); these tests
 * verify the exact invariants it depends on.
 */
describe("Member-number generation (integration, real Postgres)", () => {
  afterAll(async () => {
    if (createdMemberIds.length > 0) {
      await prisma.member.deleteMany({ where: { id: { in: createdMemberIds } } });
    }
    if (organizationId) {
      await prisma.organization.deleteMany({ where: { id: organizationId } });
    }
    await prisma.$disconnect();
  });

  async function makeOrg() {
    if (organizationId) return organizationId;
    const org = await prisma.organization.create({
      data: { name: `Test Org Member Number ${runId}`, slug: `test-org-member-number-${runId}` },
    });
    organizationId = org.id;
    return organizationId;
  }

  async function createTestMember(memberNumber: string, email: string) {
    const orgId = await makeOrg();
    const member = await prisma.member.create({
      data: {
        organizationId: orgId,
        memberNumber,
        fullName: `Test Member ${runId}`,
        email,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });
    createdMemberIds.push(member.id);
    return member;
  }

  // A. Normal sequential member creation.
  it("(A) generates strictly increasing, never-repeating numbers on successive calls", async () => {
    const first = await generateMemberNumber();
    const second = await generateMemberNumber();
    const third = await generateMemberNumber();

    const firstN = Number(first.split("-")[1]);
    const secondN = Number(second.split("-")[1]);
    const thirdN = Number(third.split("-")[1]);

    expect(secondN).toBe(firstN + 1);
    expect(thirdN).toBe(secondN + 1);
    expect(first).toMatch(/^CH360-\d{6}$/);
  });

  // B. Deleted member / gap scenario — a number consumed and then deleted
  // must never be reissued, unlike the old count()-based scheme.
  it("(B) a deleted member's number is never reissued, even though it creates a gap", async () => {
    const numberToDelete = await generateMemberNumber();
    const member = await createTestMember(numberToDelete, `gap-test-${runId}@example.com`);

    // Hard-delete it — this is exactly the scenario that broke count()+1:
    // total row count now drops, but the highest number ever issued does not.
    await prisma.member.delete({ where: { id: member.id } });
    createdMemberIds.splice(createdMemberIds.indexOf(member.id), 1);

    const nextNumber = await generateMemberNumber();
    expect(nextNumber).not.toBe(numberToDelete);
    expect(Number(nextNumber.split("-")[1])).toBeGreaterThan(Number(numberToDelete.split("-")[1]));

    // Confirm the deleted number is genuinely free again (no lingering row).
    const stillExists = await prisma.member.findUnique({ where: { memberNumber: numberToDelete } });
    expect(stillExists).toBeNull();
  });

  // C. Existing email collision — still correctly detected and classified.
  it("(C) an email collision is a real P2002 correctly classified on the email field", async () => {
    const email = `email-collision-${runId}@example.com`;
    await createTestMember(await generateMemberNumber(), email);

    let caught: unknown;
    try {
      await prisma.member.create({
        data: {
          organizationId,
          memberNumber: await generateMemberNumber(),
          fullName: "Duplicate Email Attempt",
          email,
          role: "CREATOR",
          status: "ACTIVE",
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    expect(isUniqueConstraintError(caught)).toBe(true);
    expect(isUniqueConstraintErrorOnField(caught, "email")).toBe(true);
    expect(isUniqueConstraintErrorOnField(caught, "memberNumber")).toBe(false);
  });

  // D. Member-number collision — must be classified as memberNumber, never
  // misreported as an email collision (the exact production bug).
  it("(D) a memberNumber collision is classified as memberNumber, never mislabeled as email", async () => {
    const memberNumber = await generateMemberNumber();
    await createTestMember(memberNumber, `membernum-collision-a-${runId}@example.com`);

    let caught: unknown;
    try {
      await prisma.member.create({
        data: {
          organizationId,
          memberNumber, // deliberately reused, distinct email
          fullName: "Duplicate MemberNumber Attempt",
          email: `membernum-collision-b-${runId}@example.com`,
          role: "CREATOR",
          status: "ACTIVE",
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    expect(isUniqueConstraintError(caught)).toBe(true);
    expect(isUniqueConstraintErrorOnField(caught, "memberNumber")).toBe(true);
    // This is the exact assertion that would have failed before the fix:
    // the old code's generic fallback returned the email message for this case.
    expect(isUniqueConstraintErrorOnField(caught, "email")).toBe(false);
  });

  // E. Concurrent creation — two "admins approving at the same time" must
  // never receive the same member number.
  it("(E) concurrent generateMemberNumber() calls never collide", async () => {
    const CONCURRENCY = 20;
    const numbers = await Promise.all(Array.from({ length: CONCURRENCY }, () => generateMemberNumber()));

    const unique = new Set(numbers);
    expect(unique.size).toBe(CONCURRENCY);
  });

  // F. Approval failure leaves consistent state — an application stays
  // PENDING and no member row exists when creation fails on a genuine
  // email collision (mirrors the guard in review-actions.ts).
  it("(F) a failed member creation leaves the application untouched and creates no member", async () => {
    const orgId = await makeOrg();
    const email = `approval-failure-${runId}@example.com`;
    await createTestMember(await generateMemberNumber(), email);

    const application = await prisma.membershipApplication.create({
      data: {
        organizationId: orgId,
        fullName: "Approval Failure Test",
        email,
        phone: "2025550100",
        role: "CREATOR",
        status: "PENDING",
      },
    });

    let caught: unknown;
    try {
      await prisma.member.create({
        data: {
          organizationId: orgId,
          memberNumber: await generateMemberNumber(),
          fullName: application.fullName,
          email: application.email, // collides with the member created above
          role: application.role,
          status: "ACTIVE",
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(isUniqueConstraintErrorOnField(caught, "email")).toBe(true);

    const reloaded = await prisma.membershipApplication.findUnique({ where: { id: application.id } });
    expect(reloaded?.status).toBe("PENDING");
    expect(reloaded?.reviewedAt).toBeNull();

    const membersForEmail = await prisma.member.findMany({ where: { email } });
    expect(membersForEmail).toHaveLength(1); // only the one created before the failed attempt

    await prisma.membershipApplication.delete({ where: { id: application.id } });
  });
});
