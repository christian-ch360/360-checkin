"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EmailCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { getEmailFrom } from "@/lib/email/resend";
import { sendEmailWithRetry } from "@/lib/email/send-email";
import { renderCustomContent } from "@/lib/email/template-overrides";
import { sanitizeEmailHtml } from "@/lib/email/template-html-sanitize";
import { extractVariableTokens } from "@/lib/email/template-interpolation";
import {
  emailTemplateSchema,
  templateKeySchema,
  type EmailTemplateInput,
} from "@/features/communications/schemas/email-template.schema";
import {
  isSystemTemplateKey,
  templateKeyIsTaken,
  getAvailableVariables,
  getSampleVariableValues,
  getEmailTemplateForEdit,
} from "@/features/communications/services/email-template-admin.service";

export type EmailTemplateActionResult = { success: true; templateKey: string } | { success: false; error: string };

async function requireCommunicationsManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "communications.manage")) {
    throw new Error("Only Super Admins can manage email templates.");
  }
  return actor;
}

function revalidateTemplateSurfaces(templateKey?: string) {
  revalidatePath("/admin/email-templates");
  if (templateKey) revalidatePath(`/admin/email-templates/${templateKey}/edit`);
}

/**
 * "Do not allow partially configured templates to become active
 * accidentally" — a template referencing a `{{variable}}` this template
 * key can't actually supply is blocked from going ACTIVE (Draft is always
 * allowed regardless, since it never sends for real).
 */
function findUnknownVariables(
  content: { subject: string; previewText?: string | null; bodyHtml: string },
  available: string[]
): string[] {
  const known = new Set(available);
  const used = new Set([
    ...extractVariableTokens(content.subject),
    ...extractVariableTokens(content.previewText ?? ""),
    ...extractVariableTokens(content.bodyHtml),
  ]);
  return [...used].filter((t) => !known.has(t));
}

function unknownVariableError(unknown: string[]): string {
  return `Unknown variable${unknown.length > 1 ? "s" : ""}: ${unknown.map((t) => `{{${t}}}`).join(", ")}. Fix before activating, or save as Draft.`;
}

/** A brand-new admin-authored template with its own admin-chosen key — see updateEmailTemplateAction for editing an existing (system or custom) template. */
export async function createEmailTemplateAction(input: EmailTemplateInput): Promise<EmailTemplateActionResult> {
  let actor;
  try {
    actor = await requireCommunicationsManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const parsed = emailTemplateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  if (await templateKeyIsTaken(actor.organizationId, data.templateKey)) {
    return { success: false, error: "That template key is already in use." };
  }

  if (data.status === "ACTIVE") {
    const unknown = findUnknownVariables(data, getAvailableVariables(data.templateKey));
    if (unknown.length > 0) return { success: false, error: unknownVariableError(unknown) };
  }

  const template = await prisma.emailTemplate.create({
    data: {
      organizationId: actor.organizationId,
      templateKey: data.templateKey,
      isSystem: false,
      name: data.name,
      description: data.description || null,
      category: data.category,
      subject: data.subject,
      previewText: data.previewText || null,
      bodyHtml: sanitizeEmailHtml(data.bodyHtml),
      status: data.status,
      createdById: actor.id,
      updatedById: actor.id,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "email_template.created",
    entityType: "email_template",
    entityId: template.id,
    after: { templateKey: template.templateKey, status: template.status },
  });

  revalidateTemplateSurfaces(template.templateKey);
  return { success: true, templateKey: template.templateKey };
}

/**
 * Updates the template at `templateKey` — for a system key with no override
 * row yet, this is what creates that row (an upsert, not a second create
 * path): editing a system template for the first time and editing it again
 * later go through the exact same function, so there's only ever one saved
 * record per key, never a duplicate.
 */
export async function updateEmailTemplateAction(
  templateKey: string,
  input: EmailTemplateInput
): Promise<EmailTemplateActionResult> {
  let actor;
  try {
    actor = await requireCommunicationsManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const parsed = emailTemplateSchema.omit({ templateKey: true }).safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const isSystem = isSystemTemplateKey(templateKey);
  if (!isSystem) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { organizationId_templateKey: { organizationId: actor.organizationId, templateKey } },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Template not found." };
  }

  if (data.status === "ACTIVE") {
    const unknown = findUnknownVariables(data, getAvailableVariables(templateKey));
    if (unknown.length > 0) return { success: false, error: unknownVariableError(unknown) };
  }

  const writeData = {
    name: data.name,
    description: data.description || null,
    category: data.category,
    subject: data.subject,
    previewText: data.previewText || null,
    bodyHtml: sanitizeEmailHtml(data.bodyHtml),
    status: data.status,
    updatedById: actor.id,
  };

  const template = await prisma.emailTemplate.upsert({
    where: { organizationId_templateKey: { organizationId: actor.organizationId, templateKey } },
    create: { organizationId: actor.organizationId, templateKey, isSystem, createdById: actor.id, ...writeData },
    update: writeData,
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "email_template.updated",
    entityType: "email_template",
    entityId: template.id,
    after: { templateKey, status: template.status },
  });

  revalidateTemplateSurfaces(templateKey);
  return { success: true, templateKey };
}

async function generateUniqueDuplicateKey(organizationId: string, sourceKey: string): Promise<string> {
  const base = `${sourceKey}_copy`.slice(0, 55);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}_${i + 1}`;
    if (!(await templateKeyIsTaken(organizationId, candidate))) return candidate;
  }
  return `${base}_${Date.now()}`;
}

/** Always creates a new custom (isSystem=false) DRAFT template, regardless of whether the source is a system or custom template — "safely create variations" without ever touching the source. */
export async function duplicateEmailTemplateAction(sourceTemplateKey: string): Promise<EmailTemplateActionResult> {
  let actor;
  try {
    actor = await requireCommunicationsManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const source = await getEmailTemplateForEdit(actor.organizationId, sourceTemplateKey);
  if (!source) return { success: false, error: "Template not found." };

  const newKey = await generateUniqueDuplicateKey(actor.organizationId, sourceTemplateKey);

  const template = await prisma.emailTemplate.create({
    data: {
      organizationId: actor.organizationId,
      templateKey: newKey,
      isSystem: false,
      name: `${source.name} (Copy)`,
      description: source.description || null,
      category: source.category,
      subject: source.subject,
      previewText: source.previewText || null,
      bodyHtml: source.bodyHtml,
      status: "DRAFT",
      createdById: actor.id,
      updatedById: actor.id,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "email_template.duplicated",
    entityType: "email_template",
    entityId: template.id,
    before: { sourceTemplateKey },
    after: { templateKey: newKey },
  });

  revalidateTemplateSurfaces();
  return { success: true, templateKey: newKey };
}

/** Activate / deactivate / revert-to-draft. For a system-key row, INACTIVE (or DRAFT) IS "revert to default" — renderTemplateWithOverride only honors ACTIVE rows, so the code template takes back over immediately with the row's history intact. */
export async function setEmailTemplateStatusAction(
  templateKey: string,
  status: "DRAFT" | "ACTIVE" | "INACTIVE"
): Promise<EmailTemplateActionResult> {
  let actor;
  try {
    actor = await requireCommunicationsManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const existing = await prisma.emailTemplate.findUnique({
    where: { organizationId_templateKey: { organizationId: actor.organizationId, templateKey } },
  });
  if (!existing) return { success: false, error: "This template has no saved content yet — edit and save it first." };

  if (status === "ACTIVE") {
    const unknown = findUnknownVariables(existing, getAvailableVariables(templateKey));
    if (unknown.length > 0) return { success: false, error: unknownVariableError(unknown) };
  }

  await prisma.emailTemplate.update({ where: { id: existing.id }, data: { status, updatedById: actor.id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action:
      status === "ACTIVE" ? "email_template.activated" : status === "INACTIVE" ? "email_template.deactivated" : "email_template.reverted_to_draft",
    entityType: "email_template",
    entityId: existing.id,
    before: { status: existing.status },
    after: { status },
  });

  revalidateTemplateSurfaces(templateKey);
  return { success: true, templateKey };
}

/** Custom templates only — a system template's "delete" equivalent is deactivating it (see setEmailTemplateStatusAction), since the code default underneath is never actually gone. */
export async function deleteEmailTemplateAction(templateKey: string): Promise<EmailTemplateActionResult> {
  let actor;
  try {
    actor = await requireCommunicationsManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  if (isSystemTemplateKey(templateKey)) {
    return { success: false, error: "System templates can't be deleted — deactivate it to revert to the default instead." };
  }

  const existing = await prisma.emailTemplate.findUnique({
    where: { organizationId_templateKey: { organizationId: actor.organizationId, templateKey } },
  });
  if (!existing) return { success: false, error: "Template not found." };

  await prisma.emailTemplate.delete({ where: { id: existing.id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "email_template.deleted",
    entityType: "email_template",
    entityId: existing.id,
    before: { templateKey, name: existing.name },
  });

  revalidateTemplateSurfaces();
  return { success: true, templateKey };
}

export type EditorRenderResult = { subject: string; html: string; text: string };

/** Renders the editor's CURRENT (possibly unsaved) form content against sample data — the live preview panel's data source. */
export async function previewEditorContentAction(input: {
  templateKey: string;
  subject: string;
  previewText: string;
  bodyHtml: string;
}): Promise<EditorRenderResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) throw new Error("Not authorized.");

  const variables = getSampleVariableValues(input.templateKey);
  return renderCustomContent(
    { subject: input.subject, previewText: input.previewText || null, bodyHtml: input.bodyHtml },
    variables
  );
}

export type SendTestFromEditorResult = { success: true } | { success: false; error: string };

const sendTestFromEditorSchema = z.object({
  templateKey: templateKeySchema,
  category: z.nativeEnum(EmailCategory),
  subject: z.string().min(1, "Enter a subject"),
  previewText: z.string().optional().or(z.literal("")),
  bodyHtml: z.string().min(1, "Enter the email body"),
  to: z.string().email("Enter a valid email"),
});

/**
 * "The test email uses the CURRENT unsaved editor content" — renders
 * exactly what's in the form right now (never what's persisted), so an
 * admin can test before ever saving or activating. Always a single explicit
 * recipient, same as the catalog page's existing Send Test — never a
 * membership-list broadcast.
 */
export async function sendTestFromEditorAction(input: {
  templateKey: string;
  category: EmailCategory;
  subject: string;
  previewText: string;
  bodyHtml: string;
  to: string;
}): Promise<SendTestFromEditorResult> {
  let actor;
  try {
    actor = await requireCommunicationsManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const parsed = sendTestFromEditorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const variables = getSampleVariableValues(data.templateKey);
  const { subject, html, text } = await renderCustomContent(
    { subject: data.subject, previewText: data.previewText || null, bodyHtml: data.bodyHtml },
    variables
  );
  const testSubject = `[TEST] ${subject}`;
  const from = getEmailFrom();

  const log = await prisma.emailLog.create({
    data: {
      organizationId: actor.organizationId,
      to: data.to,
      recipientName: "Test send (unsaved editor content)",
      subject: testSubject,
      template: data.templateKey,
      category: data.category,
      status: "QUEUED",
      from,
      html,
      text,
      sentById: actor.id,
    },
  });

  const result = await sendEmailWithRetry({ to: data.to, subject: testSubject, html, text });
  const now = new Date();

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      status: result.sent ? "SENT" : "FAILED",
      providerId: result.providerId ?? null,
      error: result.sent ? null : (result.reason ?? null),
      attempts: result.attempts,
      deliveredAt: result.sent ? now : null,
      failedAt: result.sent ? null : now,
    },
  });

  if (!result.sent) return { success: false, error: `Send failed: ${result.reason ?? "unknown error"}` };
  return { success: true };
}
