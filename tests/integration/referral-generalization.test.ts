import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import {
  validateReferralCode,
  createReferralLinkForApplication,
  connectReferralOnApproval,
  setReferralCodeDisabled,
  regenerateReferralCode,
} from "@/features/referrals/services/referral.service";
import { generateReferralCode, ensureReferralCode } from "@/features/referrals/services/referral-code";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let creatorId: string;
let creatorCode: string;

/**
 * Covers the 13 scenarios explicitly enumerated in the referral-system spec
 * (section 20) that aren't already exercised by referral-tracking.test.ts's
 * Agency-specific flow: case-insensitivity, duplicate-code prevention,
 * referral persistence through the application lifecycle, submission
 * without a referral, self-referral prevention, unauthorized data access,
 * code regeneration, disabled codes, and pre-existing unreferred
 * applications continuing to work.
 */
describe("Referral system generalization (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Referral Gen ${runId}`, slug: `test-org-referral-gen-${runId}` },
    });
    organizationId = org.id;

    const creator = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-RG-CREATOR-${runId}`,
        fullName: "Generalization Creator",
        email: `rg-creator-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });
    creatorId = creator.id;
    creatorCode = (await ensureReferralCode(creatorId, "CREATOR"))!;
  });

  afterAll(async () => {
    await prisma.referralLink.deleteMany({ where: { organizationId } });
    await prisma.membershipApplication.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  // 1. Valid referral code
  it("(1) valid referral code — validateReferralCode accepts a real active CREATOR's code", async () => {
    const result = await validateReferralCode(organizationId, creatorCode);
    expect(result.valid).toBe(true);
  });

  // 2. Invalid referral code
  it("(2) invalid referral code — validateReferralCode rejects an unknown code without crashing", async () => {
    const result = await validateReferralCode(organizationId, "CRT-999999");
    expect(result.valid).toBe(false);
  });

  // 3. Case-insensitivity
  it("(3) case-insensitivity — validateReferralCode accepts a lowercase/mixed-case code", async () => {
    const lower = await validateReferralCode(organizationId, creatorCode.toLowerCase());
    const mixed = await validateReferralCode(organizationId, creatorCode.charAt(0) + creatorCode.slice(1).toLowerCase());
    expect(lower.valid).toBe(true);
    expect(mixed.valid).toBe(true);
  });

  // 4. Duplicate referral code prevention
  it("(4) duplicate referral code prevention — Member.referralCode is unique at the database level", async () => {
    const other = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-RG-DUPE-${runId}`,
        fullName: "Duplicate Code Attempt",
        email: `rg-dupe-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });

    await expect(prisma.member.update({ where: { id: other.id }, data: { referralCode: creatorCode } })).rejects.toMatchObject({
      code: "P2002",
    } as Prisma.PrismaClientKnownRequestError);

    await prisma.member.delete({ where: { id: other.id } });
  });

  // 5. Referral persistence through the application flow
  it("(5) referral persistence — the ReferralLink survives independent updates to the application (e.g. notes)", async () => {
    const app = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Persist Applicant", email: `rg-persist-${runId}@example.com`, phone: "5550001111", role: "CREATOR" },
    });
    await createReferralLinkForApplication(organizationId, app.id, creatorCode, "LINK", app.email);

    await prisma.membershipApplication.update({ where: { id: app.id }, data: { notes: "reviewed" } });

    const link = await prisma.referralLink.findUnique({ where: { applicationId: app.id } });
    expect(link).not.toBeNull();
    expect(link!.referrerMemberId).toBe(creatorId);
  });

  // 6. Application submitted with referral
  it("(6) application submitted with referral — creates a PENDING ReferralLink tied to the application", async () => {
    const app = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "With Referral", email: `rg-with-${runId}@example.com`, phone: "5550002222", role: "CREATOR" },
    });
    const link = await createReferralLinkForApplication(organizationId, app.id, creatorCode, "QR_CODE", app.email);
    expect(link).not.toBeNull();
    expect(link!.status).toBe("PENDING");
  });

  // 7. Application submitted without referral
  it("(7) application submitted without referral — succeeds normally, no ReferralLink created", async () => {
    const app = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "No Referral", email: `rg-none-${runId}@example.com`, phone: "5550003333", role: "CREATOR" },
    });
    const link = await prisma.referralLink.findUnique({ where: { applicationId: app.id } });
    expect(link).toBeNull();
    expect(app.status).toBe("PENDING");
  });

  // 8. Referral preserved after approval
  it("(8) referral preserved after approval — connectReferralOnApproval sets referredByMemberId permanently", async () => {
    const app = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Approved Referral", email: `rg-approved-${runId}@example.com`, phone: "5550004444", role: "CREATOR" },
    });
    await createReferralLinkForApplication(organizationId, app.id, creatorCode, "LINK", app.email);

    const newMember = await prisma.member.create({
      data: { organizationId, memberNumber: `TEST-RG-APPROVED-${runId}`, fullName: "Approved Referral", email: app.email, role: "CREATOR", status: "ACTIVE" },
    });
    const updatedLink = await connectReferralOnApproval(app.id, newMember.id);
    expect(updatedLink!.status).toBe("ACTIVE");

    const memberAfter = await prisma.member.findUniqueOrThrow({ where: { id: newMember.id } });
    expect(memberAfter.referredByMemberId).toBe(creatorId);
    expect(memberAfter.referredByCode).toBe(creatorCode);
  });

  // 9. Self-referral prevention
  it("(9) self-referral prevention — an applicant using their own referrer's email no-ops instead of linking", async () => {
    const app = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Generalization Creator", email: `rg-creator-${runId}@example.com`, phone: "5550005555", role: "CREATOR" },
    });
    const link = await createReferralLinkForApplication(organizationId, app.id, creatorCode, "LINK", app.email);
    expect(link).toBeNull();
  });

  // 10. Unauthorized referral data access
  it("(10) unauthorized referral data access — only Admin/Manager/Super Admin hold referrals.view; plain Members don't", async () => {
    expect(hasPermission("MEMBER", "referrals.view")).toBe(false);
    expect(hasPermission("PROJECT_LEADER", "referrals.view")).toBe(false);
    expect(hasPermission("MANAGER", "referrals.view")).toBe(true);
    expect(hasPermission("ADMIN", "referrals.view")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "referrals.view")).toBe(true);
  });

  // 11. Referral code regeneration
  it("(11) referral code regeneration — mints a new code without altering historical ReferralLink attribution", async () => {
    const app = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Pre-Regen Applicant", email: `rg-preregen-${runId}@example.com`, phone: "5550006666", role: "CREATOR" },
    });
    await createReferralLinkForApplication(organizationId, app.id, creatorCode, "LINK", app.email);
    const oldLink = await prisma.referralLink.findUnique({ where: { applicationId: app.id } });

    const result = await regenerateReferralCode(organizationId, creatorId);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.referralCode).not.toBe(creatorCode);

    const linkAfter = await prisma.referralLink.findUnique({ where: { id: oldLink!.id } });
    expect(linkAfter!.referralCode).toBe(creatorCode); // historical snapshot unchanged

    // Old code no longer resolves to this creator; new code does.
    const oldValidation = await validateReferralCode(organizationId, creatorCode);
    expect(oldValidation.valid).toBe(false);
    const newValidation = await validateReferralCode(organizationId, result.referralCode!);
    expect(newValidation.valid).toBe(true);

    creatorCode = result.referralCode!;
  });

  // 12. Archived/disabled referral code
  it("(12) archived/disabled referral code — a disabled code fails validation and behaves like a normal (unreferred) application", async () => {
    const disableResult = await setReferralCodeDisabled(organizationId, creatorId, true);
    expect(disableResult.success).toBe(true);

    const validation = await validateReferralCode(organizationId, creatorCode);
    expect(validation.valid).toBe(false);

    const app = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Disabled Code Applicant", email: `rg-disabled-${runId}@example.com`, phone: "5550007777", role: "CREATOR" },
    });
    const link = await createReferralLinkForApplication(organizationId, app.id, creatorCode, "LINK", app.email);
    expect(link).toBeNull();

    await setReferralCodeDisabled(organizationId, creatorId, false);
  });

  // 13. Existing applications without referrals continue working
  it("(13) existing applications without referrals continue working — approval succeeds with no ReferralLink involved", async () => {
    const app = await prisma.membershipApplication.create({
      data: { organizationId, fullName: "Legacy Unreferred", email: `rg-legacy-${runId}@example.com`, phone: "5550008888", role: "CREATOR" },
    });
    const member = await prisma.member.create({
      data: { organizationId, memberNumber: `TEST-RG-LEGACY-${runId}`, fullName: "Legacy Unreferred", email: app.email, role: "CREATOR", status: "ACTIVE" },
    });

    const link = await connectReferralOnApproval(app.id, member.id);
    expect(link).toBeNull();

    const memberAfter = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(memberAfter.referredByMemberId).toBeNull();
  });

  it("generateReferralCode works for a previously-restricted role (e.g. BROKER, VENDOR)", async () => {
    const brokerCode = await generateReferralCode("BROKER");
    const vendorCode = await generateReferralCode("VENDOR");
    expect(brokerCode).toMatch(/^BRK-\d{6}$/);
    expect(vendorCode).toMatch(/^VND-\d{6}$/);
  });
});
