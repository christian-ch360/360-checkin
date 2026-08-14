import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { submitApplication } from "@/features/applications/services/applications.service";

const prisma = new PrismaClient();

const runId = Date.now();
const createdMemberIds: string[] = [];
const createdApplicationEmails: string[] = [];

/**
 * "New membership application received" was the one internal event that
 * emailed every admin who can approve applications (members.approve —
 * SUPER_ADMIN + ADMIN) in addition to the in-app Notification it already
 * created (see applications.service.ts submitApplication). The email loop
 * (EmailService.sendNewMembershipApplicationAdminEmail) has been removed;
 * the pre-existing notifyMembers(...) call is now the sole mechanism for
 * this event — no new notification path was added, so there's nothing new
 * to duplicate.
 *
 * submitApplication always resolves the single default org (oldest by
 * createdAt) rather than taking one explicitly — a real architectural
 * constraint of this single-tenant codebase (see agency-uniqueness.test.ts)
 * — so fixtures live in that same org. Cleanup removes only the exact rows
 * this test creates, never the org itself or any pre-existing member.
 */
describe("Membership application: admin notification (no admin email)", () => {
  afterAll(async () => {
    if (createdApplicationEmails.length) {
      await prisma.membershipApplication.deleteMany({ where: { email: { in: createdApplicationEmails } } });
    }
    if (createdMemberIds.length) {
      await prisma.notification.deleteMany({ where: { memberId: { in: createdMemberIds } } });
      await prisma.member.deleteMany({ where: { id: { in: createdMemberIds } } });
    }
    await prisma.$disconnect();
  });

  it("notifies every members.approve holder in-app, sends no admin email, and never duplicates the notification", async () => {
    const defaultOrg = await prisma.organization.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

    const superAdmin = await prisma.member.create({
      data: {
        organizationId: defaultOrg.id,
        memberNumber: `TEST-MAN-SA-${runId}`,
        fullName: "Test Super Admin",
        email: `test-super-admin-${runId}@example.com`,
        role: "STAFF",
        systemRole: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    const nonApprover = await prisma.member.create({
      data: {
        organizationId: defaultOrg.id,
        memberNumber: `TEST-MAN-NA-${runId}`,
        fullName: "Test Non Approver",
        email: `test-non-approver-${runId}@example.com`,
        role: "STAFF",
        systemRole: "MEMBER",
        status: "ACTIVE",
      },
    });
    createdMemberIds.push(superAdmin.id, nonApprover.id);

    const applicantEmail = `test-applicant-${runId}@example.com`;
    createdApplicationEmails.push(applicantEmail);

    const application = await submitApplication({
      fullName: "Notification Test Applicant",
      email: applicantEmail,
      phone: "5551234567",
      role: "CREATOR",
      company: "",
      instagram: "notiftestapplicant",
      tiktok: "notiftestapplicant",
      youtube: "",
      city: "Austin",
      state: "TX",
      country: "USA",
      referredBy: "No Referral",
      referralCode: "",
      termsAccepted: true,
      privacyAccepted: true,
      mediaReleaseAccepted: true,
    });

    const expectedLink = `/admin/applications/${application.id}`;

    // 1. Super Admin receives exactly one in-app Notification, with the
    // right content and a link straight to this application's admin page.
    const superAdminNotifications = await prisma.notification.findMany({
      where: { memberId: superAdmin.id, link: expectedLink },
    });
    expect(superAdminNotifications).toHaveLength(1);
    expect(superAdminNotifications[0].type).toBe("MEMBERSHIP_APPLICATION_RECEIVED");
    expect(superAdminNotifications[0].title).toBe("New application: Notification Test Applicant");
    expect(superAdminNotifications[0].body).toContain("Submitted");

    // 2. A member without members.approve (plain MEMBER systemRole) gets
    // nothing for this event.
    const nonApproverNotifications = await prisma.notification.findMany({
      where: { memberId: nonApprover.id, link: expectedLink },
    });
    expect(nonApproverNotifications).toHaveLength(0);

    // 3. No admin email was sent for this event — the removed template's
    // EmailLog is absent for this Super Admin's address.
    const adminEmailLogs = await prisma.emailLog.findMany({
      where: { organizationId: defaultOrg.id, template: "new_membership_application_admin", to: superAdmin.email },
    });
    expect(adminEmailLogs).toHaveLength(0);

    // 4. Legitimate, member-facing transactional email is untouched — the
    // applicant still gets their "application received" email.
    const applicantEmailLogs = await prisma.emailLog.findMany({
      where: { organizationId: defaultOrg.id, template: "application_received", to: applicantEmail },
    });
    expect(applicantEmailLogs).toHaveLength(1);
  });
});
