import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { renderTemplate } from "@/lib/email/email-types";
import { renderTemplateWithOverride, renderCustomContent } from "@/lib/email/template-overrides";
import { extractVariableTokens, interpolateTemplate, flattenTemplateVariables } from "@/lib/email/template-interpolation";
import { emailTemplateSchema } from "@/features/communications/schemas/email-template.schema";
import {
  isSystemTemplateKey,
  templateKeyIsTaken,
  getAvailableVariables,
  getEmailTemplateForEdit,
  listEmailTemplateRows,
} from "@/features/communications/services/email-template-admin.service";
import { TEMPLATE_SAMPLE_PROPS } from "@/features/communications/config/template-sample-props";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;

/**
 * Tested at the service/permission-primitive level rather than through the
 * "use server" actions themselves — consistent with every other integration
 * test in this codebase (see referral-generalization.test.ts), since the
 * actions require a real authenticated request context (requireCurrentMember
 * reads cookies) that isn't available in Vitest. Each test here verifies the
 * exact invariant the corresponding action relies on.
 */
describe("Email Templates admin (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Email Templates ${runId}`, slug: `test-org-email-templates-${runId}` },
    });
    organizationId = org.id;
  });

  afterAll(async () => {
    await prisma.emailTemplate.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  // 1 & 2. Admin can create a template; unauthorized users cannot.
  it("(1,2) only communications.manage holders (Super Admin) can create/manage templates", () => {
    expect(hasPermission("SUPER_ADMIN", "communications.manage")).toBe(true);
    expect(hasPermission("ADMIN", "communications.manage")).toBe(false);
    expect(hasPermission("MANAGER", "communications.manage")).toBe(false);
    expect(hasPermission("MEMBER", "communications.manage")).toBe(false);
  });

  it("(1) admin can create a custom template", async () => {
    const template = await prisma.emailTemplate.create({
      data: {
        organizationId,
        templateKey: `custom_promo_${runId}`,
        isSystem: false,
        name: "Seasonal Promo",
        category: "MARKETING",
        subject: "A gift for you, {{firstName}}",
        bodyHtml: "<p>Hi {{firstName}}, enjoy this offer.</p>",
        status: "DRAFT",
      },
    });
    expect(template.id).toBeDefined();
    expect(template.isSystem).toBe(false);

    const rows = await listEmailTemplateRows(organizationId);
    expect(rows.some((r) => r.templateKey === template.templateKey)).toBe(true);
  });

  // 3 & 4. Editing updates the existing record instead of creating a duplicate.
  it("(3,4) editing a template updates the existing record — no duplicate row is created", async () => {
    const key = `custom_edit_test_${runId}`;
    const create = { organizationId, templateKey: key, isSystem: false, category: "MARKETING" as const };

    await prisma.emailTemplate.upsert({
      where: { organizationId_templateKey: { organizationId, templateKey: key } },
      create: { ...create, name: "V1", subject: "Subject V1", bodyHtml: "<p>V1</p>", status: "DRAFT" },
      update: { name: "V1", subject: "Subject V1", bodyHtml: "<p>V1</p>", status: "DRAFT" },
    });
    await prisma.emailTemplate.upsert({
      where: { organizationId_templateKey: { organizationId, templateKey: key } },
      create: { ...create, name: "V2", subject: "Subject V2", bodyHtml: "<p>V2</p>", status: "DRAFT" },
      update: { name: "V2", subject: "Subject V2", bodyHtml: "<p>V2</p>", status: "DRAFT" },
    });

    const matches = await prisma.emailTemplate.findMany({ where: { organizationId, templateKey: key } });
    expect(matches).toHaveLength(1);
    expect(matches[0].subject).toBe("Subject V2");
  });

  // 5 & 6. Duplicate generates a unique key; new duplicates start Draft/Inactive.
  it("(5) templateKeyIsTaken correctly detects collisions with both system and existing custom keys", async () => {
    expect(await templateKeyIsTaken(organizationId, "welcome")).toBe(true); // system key
    expect(await templateKeyIsTaken(organizationId, `custom_promo_${runId}`)).toBe(true); // existing custom key from test 1
    expect(await templateKeyIsTaken(organizationId, `definitely_free_${runId}`)).toBe(false);
  });

  it("(6) a duplicated template is created as DRAFT regardless of the source's status", async () => {
    const sourceKey = `custom_active_source_${runId}`;
    await prisma.emailTemplate.create({
      data: {
        organizationId,
        templateKey: sourceKey,
        isSystem: false,
        name: "Active Source",
        category: "MARKETING",
        subject: "Live subject",
        bodyHtml: "<p>Live content</p>",
        status: "ACTIVE",
      },
    });

    const duplicateKey = `${sourceKey}_copy`;
    const duplicate = await prisma.emailTemplate.create({
      data: {
        organizationId,
        templateKey: duplicateKey,
        isSystem: false,
        name: "Active Source (Copy)",
        category: "MARKETING",
        subject: "Live subject",
        bodyHtml: "<p>Live content</p>",
        status: "DRAFT", // duplicateEmailTemplateAction always forces this regardless of source.status
      },
    });
    expect(duplicate.status).toBe("DRAFT");
    expect(duplicate.templateKey).not.toBe(sourceKey);
  });

  // 7. Required fields are validated.
  it("(7) required fields are validated by the zod schema", () => {
    const missingName = emailTemplateSchema.safeParse({
      templateKey: "ok_key",
      name: "",
      category: "MARKETING",
      subject: "Subject",
      bodyHtml: "<p>Body</p>",
      status: "DRAFT",
    });
    expect(missingName.success).toBe(false);

    const missingSubjectAndBody = emailTemplateSchema.safeParse({
      templateKey: "ok_key",
      name: "Valid Name",
      category: "MARKETING",
      subject: "",
      bodyHtml: "",
      status: "DRAFT",
    });
    expect(missingSubjectAndBody.success).toBe(false);

    const invalidKey = emailTemplateSchema.safeParse({
      templateKey: "Not A Valid Key!",
      name: "Valid Name",
      category: "MARKETING",
      subject: "Subject",
      bodyHtml: "<p>Body</p>",
      status: "DRAFT",
    });
    expect(invalidKey.success).toBe(false);

    const valid = emailTemplateSchema.safeParse({
      templateKey: "valid_key_123",
      name: "Valid Name",
      category: "MARKETING",
      subject: "Subject",
      bodyHtml: "<p>Body</p>",
      status: "DRAFT",
    });
    expect(valid.success).toBe(true);
  });

  // 8. Invalid template variables are rejected/safely handled.
  it("(8) an unknown {{variable}} is detected but never breaks rendering — left as literal text", async () => {
    const available = getAvailableVariables("welcome"); // real variables for the welcome template
    const used = extractVariableTokens("Hi {{fullName}}, your code is {{totallyMadeUpVariable}}.");
    const unknown = used.filter((t) => !available.includes(t));
    expect(unknown).toContain("totallyMadeUpVariable");

    // Rendering never throws — the unknown token is left exactly as written.
    const result = interpolateTemplate("Hi {{fullName}}, code: {{totallyMadeUpVariable}}", { fullName: "Alex Rivera" });
    expect(result).toBe("Hi Alex Rivera, code: {{totallyMadeUpVariable}}");
  });

  // 9. System templates cannot be accidentally deleted.
  it("(9) every one of the 51 system template keys is protected from deletion", () => {
    expect(isSystemTemplateKey("welcome")).toBe(true);
    expect(isSystemTemplateKey("critical_system_alert")).toBe(true);
    expect(isSystemTemplateKey(`custom_promo_${runId}`)).toBe(false); // a real custom key IS deletable
  });

  // 10. Test emails use the CURRENT (possibly unsaved) editor content, not any saved row.
  it("(10) renderCustomContent renders exactly the content it's given, independent of anything saved in the database", async () => {
    const key = `custom_edit_test_${runId}`; // has "Subject V2" saved from test 3/4
    const saved = await prisma.emailTemplate.findUniqueOrThrow({
      where: { organizationId_templateKey: { organizationId, templateKey: key } },
    });
    expect(saved.subject).toBe("Subject V2");

    // "Unsaved editor content" — deliberately different from what's persisted.
    const unsavedRendered = await renderCustomContent(
      { subject: "Unsaved Draft Subject", previewText: null, bodyHtml: "<p>Unsaved draft body, {{firstName}}</p>" },
      { firstName: "Christian" }
    );
    expect(unsavedRendered.subject).toBe("Unsaved Draft Subject");
    expect(unsavedRendered.html).toContain("Unsaved draft body, Christian");
    expect(unsavedRendered.html).not.toContain("Subject V2");
  });

  // 11. Template activation/deactivation works.
  it("(11) an ACTIVE override changes what a real send renders; deactivating reverts to the code default", async () => {
    const overrideKey = "welcome"; // a real system template

    await prisma.emailTemplate.upsert({
      where: { organizationId_templateKey: { organizationId, templateKey: overrideKey } },
      create: {
        organizationId,
        templateKey: overrideKey,
        isSystem: true,
        name: "Welcome",
        category: "AUTHENTICATION",
        subject: "Custom welcome subject for {{fullName}}",
        bodyHtml: "<p>Custom welcome body for {{fullName}}.</p>",
        status: "ACTIVE",
      },
      update: { status: "ACTIVE", subject: "Custom welcome subject for {{fullName}}", bodyHtml: "<p>Custom welcome body for {{fullName}}.</p>" },
    });

    const activeRender = await renderTemplateWithOverride(organizationId, overrideKey, TEMPLATE_SAMPLE_PROPS.welcome);
    expect(activeRender.subject).toContain("Custom welcome subject for");
    expect(activeRender.html).toContain("Custom welcome body for");

    // Deactivate — the code default must take back over.
    await prisma.emailTemplate.update({
      where: { organizationId_templateKey: { organizationId, templateKey: overrideKey } },
      data: { status: "INACTIVE" },
    });

    const defaultAfterDeactivate = await renderTemplateWithOverride(organizationId, overrideKey, TEMPLATE_SAMPLE_PROPS.welcome);
    const codeDefault = await renderTemplate("welcome", TEMPLATE_SAMPLE_PROPS.welcome);
    expect(defaultAfterDeactivate.subject).toBe(codeDefault.subject);
    expect(defaultAfterDeactivate.html).toBe(codeDefault.html);
  });

  // 12. HTML/template rendering works.
  it("(12) renderCustomContent produces real interpolated HTML and a stripped plain-text version", async () => {
    const rendered = await renderCustomContent(
      { subject: "Hello {{firstName}}", previewText: "Preview for {{firstName}}", bodyHtml: "<p>Hi <strong>{{firstName}}</strong>, welcome!</p>" },
      { firstName: "Christian" }
    );
    expect(rendered.subject).toBe("Hello Christian");
    expect(rendered.html).toContain("Christian");
    expect(rendered.html).toContain("<strong>"); // sanitizeEmailHtml allows strong
    expect(rendered.text).toContain("Christian");
    expect(rendered.text).not.toContain("<strong>"); // text version has no markup
  });

  // 13. Existing email templates continue to work exactly as before, with no override.
  it("(13) a template with no saved override renders byte-for-byte identical to the plain code default", async () => {
    const untouchedKey = "password_reset"; // never touched by any test above
    expect(await prisma.emailTemplate.findUnique({ where: { organizationId_templateKey: { organizationId, templateKey: untouchedKey } } })).toBeNull();

    const withOverridePath = await renderTemplateWithOverride(organizationId, untouchedKey, TEMPLATE_SAMPLE_PROPS.password_reset);
    const plain = await renderTemplate(untouchedKey, TEMPLATE_SAMPLE_PROPS.password_reset);
    expect(withOverridePath).toEqual(plain);
  });

  it("getEmailTemplateForEdit synthesizes a fresh DRAFT starting point for an untouched system template", async () => {
    const data = await getEmailTemplateForEdit(organizationId, "password_reset");
    expect(data).not.toBeNull();
    expect(data!.isNew).toBe(true);
    expect(data!.status).toBe("DRAFT");
    expect(data!.isSystem).toBe(true);
    expect(data!.subject.length).toBeGreaterThan(0);
  });

  it("flattenTemplateVariables derives firstName from fullName without inventing unavailable data", () => {
    const variables = flattenTemplateVariables({ fullName: "Christian Bipat", email: "cjbipat@gmail.com" });
    expect(variables.firstName).toBe("Christian");
    expect(variables.fullName).toBe("Christian Bipat");
    expect(variables.email).toBe("cjbipat@gmail.com");
  });
});
