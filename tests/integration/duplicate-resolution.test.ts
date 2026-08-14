import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { normalizeEmail } from "@/lib/utils/email";
import { findEmailConflict, applicationConflictMessage } from "@/features/members/services/email-lookup.service";
import { findDuplicateEmailGroups } from "@/features/admin/services/duplicate-emails.service";
import { listUnresolvedDuplicateGroups } from "@/features/admin/services/duplicate-resolution.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;

/**
 * The Duplicate Emails admin page/nav entry has been removed (every
 * historical duplicate-email group is resolved — see
 * prisma/backfill-duplicate-applications.ts, backfill-duplicate-case-b.ts,
 * backfill-duplicate-case-c.ts), but the classification logic
 * (listUnresolvedDuplicateGroups) and email-uniqueness enforcement
 * (findEmailConflict) stay in place and stay tested: a new historical
 * import or data-repair job could surface a fresh duplicate group, and new
 * applications must still never be able to reuse an existing email.
 *
 * The mutation tests below reproduce resolveDuplicateGroup's exact writes
 * (src/features/admin/services/duplicate-resolution.actions.ts — still
 * exported, still used by the backfill scripts above) directly against real
 * Postgres rather than calling it through a "use server" action, consistent
 * with every other integration test in this codebase (see
 * email-templates-admin.test.ts): actions require a real authenticated
 * request context (requireCurrentMember reads cookies via Supabase) that
 * isn't available in Vitest.
 */
describe("Duplicate-email cleanup (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Duplicates ${runId}`, slug: `test-org-duplicates-${runId}` },
    });
    organizationId = org.id;
  });

  afterAll(async () => {
    await prisma.membershipApplication.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("only members.manage holders (Super Admin/Admin/Manager) can access duplicate resolution", () => {
    expect(hasPermission("SUPER_ADMIN", "members.manage")).toBe(true);
    expect(hasPermission("ADMIN", "members.manage")).toBe(true);
    expect(hasPermission("MANAGER", "members.manage")).toBe(true);
    expect(hasPermission("PROJECT_LEADER", "members.manage")).toBe(false);
    expect(hasPermission("MEMBER", "members.manage")).toBe(false);
  });

  it("CASE A (Approved + Pending, matching name): recommends keeping the approved application", async () => {
    const email = `case-a-${runId}@example.com`;
    const approved = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Katrell Platt", email, phone: "5550001111", role: "CREATOR", status: "APPROVED" },
    });
    await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Katrell Platt", email, phone: "5550001112", role: "CREATOR", status: "PENDING" },
    });

    const groups = await listUnresolvedDuplicateGroups(organizationId);
    const group = groups.find((g) => g.email === normalizeEmail(email));
    expect(group).toBeDefined();
    expect(group!.caseType).toBe("approved_pending");
    expect(group!.recommendedKeepApplicationId).toBe(approved.id);
  });

  it("CASE B (multiple pending, no approved): no automatic recommendation — requires manual selection", async () => {
    const email = `case-b-${runId}@example.com`;
    await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Jordan Reyes", email, phone: "5550002221", role: "CREATOR", status: "PENDING" },
    });
    await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Jordan Reyes", email, phone: "5550002222", role: "CREATOR", status: "PENDING" },
    });

    const groups = await listUnresolvedDuplicateGroups(organizationId);
    const group = groups.find((g) => g.email === normalizeEmail(email));
    expect(group).toBeDefined();
    expect(group!.caseType).toBe("multiple_pending");
    expect(group!.recommendedKeepApplicationId).toBeNull();
  });

  it("CASE C (different names sharing an email): flagged for manual review, no recommendation even with an approved application", async () => {
    const email = `bigsiixstake-${runId}@example.com`;
    await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Abdul Rana", email, phone: "5550003331", role: "CREATOR", status: "APPROVED" },
    });
    await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Rashel Herrera", email, phone: "5550003332", role: "CREATOR", status: "PENDING" },
    });

    const groups = await listUnresolvedDuplicateGroups(organizationId);
    const group = groups.find((g) => g.email === normalizeEmail(email));
    expect(group).toBeDefined();
    expect(group!.caseType).toBe("different_names");
    expect(group!.recommendedKeepApplicationId).toBeNull();
  });

  it("resolving a group: pending marked DUPLICATE, approved stays APPROVED, duplicate remains in the database", async () => {
    const email = `resolve-a-${runId}@example.com`;
    const approved = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Ibrahim Alkhatib", email, phone: "5550004441", role: "CREATOR", status: "APPROVED" },
    });
    const pending = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Ibrahim Alkhatib", email, phone: "5550004442", role: "CREATOR", status: "PENDING" },
    });

    // Mirrors the exact write resolveDuplicateGroup performs for the
    // "Keep Approved + Mark Pending Duplicate" case.
    const now = new Date();
    await prisma.membershipApplication.update({
      where: { id: pending.id },
      data: {
        status: "DUPLICATE",
        duplicateOfApplicationId: approved.id,
        duplicateResolvedAt: now,
        duplicateResolvedByMemberId: null,
        duplicateResolutionNote: "Resolved in test",
      },
    });

    const approvedAfter = await prisma.membershipApplication.findUniqueOrThrow({ where: { id: approved.id } });
    expect(approvedAfter.status).toBe("APPROVED");
    expect(approvedAfter.duplicateOfApplicationId).toBeNull();

    // Never deleted — still fully present and reviewable.
    const pendingAfter = await prisma.membershipApplication.findUniqueOrThrow({ where: { id: pending.id } });
    expect(pendingAfter).not.toBeNull();
    expect(pendingAfter.status).toBe("DUPLICATE");
    expect(pendingAfter.duplicateOfApplicationId).toBe(approved.id);
    expect(pendingAfter.duplicateResolvedAt).not.toBeNull();
    expect(pendingAfter.duplicateResolutionNote).toBe("Resolved in test");

    // The relationship is queryable from either side.
    const withDuplicates = await prisma.membershipApplication.findUniqueOrThrow({
      where: { id: approved.id },
      include: { duplicatesOfThis: true },
    });
    expect(withDuplicates.duplicatesOfThis.map((d) => d.id)).toEqual([pending.id]);

    // The group is now resolved and drops out of the unresolved list.
    const groups = await listUnresolvedDuplicateGroups(organizationId);
    expect(groups.find((g) => g.email === normalizeEmail(email))).toBeUndefined();
  });

  it("an approved application is never modified by resolving its duplicate sibling", async () => {
    const email = `resolve-b-${runId}@example.com`;
    const approved = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Ahlam", email, phone: "5550005551", role: "CREATOR", status: "APPROVED", notes: "keep me" },
    });
    const pending = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Ahlam", email, phone: "5550005552", role: "CREATOR", status: "PENDING" },
    });

    await prisma.membershipApplication.update({
      where: { id: pending.id },
      data: { status: "DUPLICATE", duplicateOfApplicationId: approved.id, duplicateResolvedAt: new Date() },
    });

    const approvedAfter = await prisma.membershipApplication.findUniqueOrThrow({ where: { id: approved.id } });
    expect(approvedAfter.status).toBe("APPROVED");
    expect(approvedAfter.notes).toBe("keep me");
    expect(approvedAfter.updatedAt.getTime()).toBe(approved.updatedAt.getTime());
  });

  it("findDuplicateEmailGroups surfaces application-email groups (case-insensitive, whitespace-normalized)", async () => {
    const email = `case-scan-${runId}@example.com`;
    await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Scan One", email: ` ${email.toUpperCase()} `, phone: "5550006661", role: "CREATOR", status: "PENDING" },
    });
    await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Scan Two", email, phone: "5550006662", role: "CREATOR", status: "PENDING" },
    });
    // Single-application emails never count as a duplicate group.
    await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Solo Applicant", email: `solo-${runId}@example.com`, phone: "5550006663", role: "CREATOR", status: "PENDING" },
    });

    const { applicationDuplicateGroups } = await findDuplicateEmailGroups(organizationId);
    const group = applicationDuplicateGroups.find((g) => g.email === email);
    expect(group).toBeDefined();
    expect(group!.applications).toHaveLength(2);
    expect(applicationDuplicateGroups.some((g) => g.email === `solo-${runId}@example.com`)).toBe(false);
  });

  it("new applications cannot reuse an existing email — case-insensitive and whitespace doesn't bypass it", async () => {
    const email = `taken-${runId}@example.com`;
    await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Taken Applicant", email, phone: "5550007771", role: "CREATOR", status: "PENDING" },
    });

    const exact = await findEmailConflict(organizationId, email);
    expect(exact).not.toBeNull();
    expect(exact!.kind).toBe("application_pending");
    expect(applicationConflictMessage(exact!)).toBe("You already have an application in progress.");

    const upperWithWhitespace = await findEmailConflict(organizationId, `  ${email.toUpperCase()}  `);
    expect(upperWithWhitespace).not.toBeNull();
    expect(upperWithWhitespace!.applicationId).toBe(exact!.applicationId);

    // A genuinely unused email is never flagged.
    const clean = await findEmailConflict(organizationId, `unused-${runId}@example.com`);
    expect(clean).toBeNull();
  });

  it("an email whose only application was marked DUPLICATE still blocks a new submission (historical record is not silently reusable)", async () => {
    const email = `historical-dup-${runId}@example.com`;
    const kept = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Kept Person", email: `kept-${runId}@example.com`, phone: "5550008881", role: "CREATOR", status: "APPROVED" },
    });
    await prisma.membershipApplication.create({
      data: {
        organizationId,
        fullName: "Historical Dupe",
        email,
        phone: "5550008882",
        role: "CREATOR",
        status: "DUPLICATE",
        duplicateOfApplicationId: kept.id,
        duplicateResolvedAt: new Date(),
      },
    });

    const conflict = await findEmailConflict(organizationId, email);
    expect(conflict).not.toBeNull();
  });

  it("existing normal (non-duplicate) applications are unaffected — a unique email has no conflict", async () => {
    const email = `normal-flow-${runId}@example.com`;
    const application = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Normal Applicant", email, phone: "5550009991", role: "CREATOR", status: "PENDING" },
    });

    const conflict = await findEmailConflict(organizationId, email, { excludeApplicationId: application.id });
    expect(conflict).toBeNull();

    const fetched = await prisma.membershipApplication.findUniqueOrThrow({ where: { id: application.id } });
    expect(fetched.status).toBe("PENDING");
    expect(fetched.duplicateOfApplicationId).toBeNull();
  });
});
