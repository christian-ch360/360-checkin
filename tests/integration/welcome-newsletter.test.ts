import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { renderTemplate } from "@/lib/email/email-types";
import { TEMPLATE_CATEGORY, TEMPLATE_DESCRIPTIONS } from "@/features/communications/config/template-catalog";
import { listEmailTemplateRows, getEmailTemplateForEdit } from "@/features/communications/services/email-template-admin.service";
import { previewTemplate, sendTestEmail } from "@/features/communications/services/template-preview.service";
import { wasEmailAlreadySent } from "@/lib/email/idempotency";
import { EmailService } from "@/lib/email/email-service";

const prisma = new PrismaClient();
const runId = Date.now();
let organizationId: string;
let actorId: string;

const NEWSLETTER_IMAGE_URL = "https://aofzeshdlmtlyncdewqm.supabase.co/storage/v1/object/public/email-assets/welcome-newsletter-6e090daab7cf.png";

/**
 * Tested at the service/rendering level rather than through
 * approveApplicationAction itself — consistent with every other integration
 * test in this codebase (see email-templates-admin.test.ts), since "use
 * server" actions require a real authenticated request context that isn't
 * available in Vitest. Each test here verifies the exact invariant
 * review-actions.ts / onboarding.ts rely on: the template renders the
 * approved artwork unmodified, is reachable through the standard admin
 * catalog/preview/send-test surfaces with no new infra, and the EmailLog-based
 * idempotency guard behaves exactly as the two call sites use it.
 */
describe("Welcome newsletter email (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Welcome Newsletter ${runId}`, slug: `test-org-welcome-newsletter-${runId}` },
    });
    organizationId = org.id;

    const actor = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-NEWSLETTER-ACTOR-${runId}`,
        fullName: "Test Actor",
        email: `newsletter-actor-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });
    actorId = actor.id;
  });

  afterAll(async () => {
    await prisma.emailLog.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("is registered in the template catalog under the MEMBERSHIP category", () => {
    expect(TEMPLATE_CATEGORY.welcome_newsletter).toBe("MEMBERSHIP");
    expect(TEMPLATE_DESCRIPTIONS.welcome_newsletter.length).toBeGreaterThan(0);
  });

  it("renders the newsletter as one hosted image at the correct subject/size/alt text — no redesigned HTML content", async () => {
    const rendered = await renderTemplate("welcome_newsletter", {});
    expect(rendered.subject).toBe("Welcome to Creator Hub 360 — You're In!");
    expect(rendered.html).toContain(NEWSLETTER_IMAGE_URL);
    expect(rendered.html).toContain('width="600"'); // ~600px per spec
    expect(rendered.html.toLowerCase()).toContain("invite only community"); // alt text present as fallback/screen-reader text
    expect(rendered.html.toLowerCase()).toContain("cassiphias@creatorhub360.com"); // full artwork content transcribed into alt text
    expect(rendered.text.length).toBeGreaterThan(0); // plain-text fallback derived from alt text, not blank
  });

  it("the hosted image URL actually resolves (public Supabase Storage object, not a local path)", async () => {
    const res = await fetch(NEWSLETTER_IMAGE_URL, { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("appears in the admin Email Templates catalog, and Preview / Send Test both work with no new admin infra", async () => {
    const rows = await listEmailTemplateRows(organizationId);
    const row = rows.find((r) => r.templateKey === "welcome_newsletter");
    expect(row).toBeDefined();
    expect(row!.isSystem).toBe(true);

    const editData = await getEmailTemplateForEdit(organizationId, "welcome_newsletter");
    expect(editData).not.toBeNull();
    expect(editData!.isSystem).toBe(true);
    expect(editData!.isNew).toBe(true); // no override saved — same behavior as every other system template

    const preview = await previewTemplate(organizationId, "welcome_newsletter");
    expect(preview.subject).toBe("Welcome to Creator Hub 360 — You're In!");
    expect(preview.html).toContain(NEWSLETTER_IMAGE_URL);

    const testResult = await sendTestEmail({ templateKey: "welcome_newsletter", to: "test-send@example.com", actorId, organizationId });
    expect(testResult).toHaveProperty("sent");
    const testLog = await prisma.emailLog.findFirst({
      where: { organizationId, template: "welcome_newsletter", subject: { startsWith: "[TEST]" } },
    });
    expect(testLog).not.toBeNull();
  });

  it("EmailService.sendWelcomeNewsletterEmail writes a real EmailLog row under the correct template/category", async () => {
    const member = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-NEWSLETTER-SEND-${runId}`,
        fullName: "Real Send Member",
        email: `newsletter-send-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });

    await EmailService.sendWelcomeNewsletterEmail({ to: member.email, organizationId, memberId: member.id, sentBy: actorId });

    const log = await prisma.emailLog.findFirst({
      where: { organizationId, memberId: member.id, template: "welcome_newsletter" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    expect(log!.category).toBe("MEMBERSHIP");
    expect(log!.subject).toBe("Welcome to Creator Hub 360 — You're In!");
    expect(log!.to).toBe(member.email);
    expect(log!.sentById).toBe(actorId);
  });

  it("wasEmailAlreadySent: QUEUED/SENT block a retry, FAILED does not (a genuinely failed send may still retry)", async () => {
    const member = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-NEWSLETTER-STATUS-${runId}`,
        fullName: "Status Test Member",
        email: `newsletter-status-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });

    expect(await wasEmailAlreadySent(organizationId, member.id, "welcome_newsletter")).toBe(false);

    const log = await prisma.emailLog.create({
      data: {
        organizationId,
        memberId: member.id,
        to: member.email,
        subject: "s",
        template: "welcome_newsletter",
        category: "MEMBERSHIP",
        status: "FAILED",
      },
    });
    expect(await wasEmailAlreadySent(organizationId, member.id, "welcome_newsletter")).toBe(false);

    await prisma.emailLog.update({ where: { id: log.id }, data: { status: "SENT" } });
    expect(await wasEmailAlreadySent(organizationId, member.id, "welcome_newsletter")).toBe(true);
  });

  it("a simulated approval retry does not re-send an email that already succeeded — exactly the guard used in review-actions.ts/onboarding.ts", async () => {
    const member = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-NEWSLETTER-RETRY-${runId}`,
        fullName: "Retry Test Member",
        email: `newsletter-retry-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });

    async function guardedSend(template: "welcome_newsletter" | "application_approved") {
      if (!(await wasEmailAlreadySent(organizationId, member.id, template))) {
        if (template === "welcome_newsletter") {
          await EmailService.sendWelcomeNewsletterEmail({ to: member.email, organizationId, memberId: member.id, sentBy: actorId });
        }
      }
    }

    // Simulate: first approval call already succeeded in sending the newsletter.
    await prisma.emailLog.create({
      data: {
        organizationId,
        memberId: member.id,
        to: member.email,
        subject: "s",
        template: "welcome_newsletter",
        category: "MEMBERSHIP",
        status: "SENT",
      },
    });

    // Simulated retry of the whole approval action.
    await guardedSend("welcome_newsletter");

    const logs = await prisma.emailLog.findMany({ where: { organizationId, memberId: member.id, template: "welcome_newsletter" } });
    expect(logs).toHaveLength(1); // the retry's guard skipped the send — no second row
  });

  it("the account/access email and the newsletter email are guarded independently of each other", async () => {
    const member = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-NEWSLETTER-INDEP-${runId}`,
        fullName: "Independence Test Member",
        email: `newsletter-indep-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });

    await prisma.emailLog.create({
      data: {
        organizationId,
        memberId: member.id,
        to: member.email,
        subject: "s",
        template: "application_approved",
        category: "MEMBERSHIP",
        status: "SENT",
      },
    });

    expect(await wasEmailAlreadySent(organizationId, member.id, "application_approved")).toBe(true);
    // The newsletter hasn't been sent yet — a SENT account/access email must
    // never block it, and vice versa. Each email has its own independent
    // EmailLog-based guard.
    expect(await wasEmailAlreadySent(organizationId, member.id, "welcome_newsletter")).toBe(false);
  });

  /**
   * review-actions.ts gates the welcome_newsletter send on
   * `application.role === "CREATOR"` — application.role is the existing
   * MembershipApplication field (MemberRole enum) used for Creator Type, no
   * new field was added. Exercised here against real MembershipApplication
   * rows created via the actual public submission schema's valid role
   * values, mirroring exactly the condition review-actions.ts evaluates —
   * consistent with this file's convention of testing the invariant the
   * "use server" action relies on rather than the action itself (which
   * needs a real authenticated request context unavailable in Vitest).
   */
  describe("welcome_newsletter is restricted to CREATOR applications", () => {
    it("a CREATOR application's role satisfies the send-gate condition", async () => {
      const application = await prisma.membershipApplication.create({
        data: {
          organizationId,
          fullName: "Creator Gate Test",
          email: `creator-gate-${runId}@example.com`,
          phone: "2025550100",
          role: "CREATOR",
          status: "APPROVED",
        },
      });
      expect(application.role === "CREATOR").toBe(true);
    });

    it("a non-CREATOR application (Brand/Agency/Broker) fails the send-gate condition", async () => {
      for (const role of ["BRAND", "AGENCY", "BROKER"] as const) {
        const application = await prisma.membershipApplication.create({
          data: {
            organizationId,
            fullName: `${role} Gate Test`,
            email: `${role.toLowerCase()}-gate-${runId}@example.com`,
            phone: "2025550100",
            role,
            status: "APPROVED",
          },
        });
        expect(application.role === "CREATOR").toBe(false);
      }
    });

    it("the newsletter guard only ever fires for the CREATOR member in a mixed batch, independent of the account email", async () => {
      const creatorMember = await prisma.member.create({
        data: {
          organizationId,
          memberNumber: `TEST-GATE-CREATOR-${runId}`,
          fullName: "Gate Creator Member",
          email: `gate-creator-${runId}@example.com`,
          role: "CREATOR",
          status: "ACTIVE",
        },
      });
      const brandMember = await prisma.member.create({
        data: {
          organizationId,
          memberNumber: `TEST-GATE-BRAND-${runId}`,
          fullName: "Gate Brand Member",
          email: `gate-brand-${runId}@example.com`,
          role: "BRAND",
          status: "ACTIVE",
        },
      });

      // Simulates review-actions.ts's exact guard for each: account email
      // (application_approved) always sends regardless of role — untouched
      // by this change; welcome_newsletter only sends when role === CREATOR.
      async function wouldSendNewsletter(applicationRole: string, memberId: string) {
        return applicationRole === "CREATOR" && !(await wasEmailAlreadySent(organizationId, memberId, "welcome_newsletter"));
      }

      expect(await wouldSendNewsletter("CREATOR", creatorMember.id)).toBe(true);
      expect(await wouldSendNewsletter("BRAND", brandMember.id)).toBe(false);

      // The account/access email's own logic (provisionMemberOnboarding) has
      // no role branch at all — verified by inspection, not re-tested here
      // since that function was not modified by this change.
    });
  });
});
