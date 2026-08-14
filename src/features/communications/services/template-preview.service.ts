import "server-only";

import type { EmailCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getEmailFrom } from "@/lib/email/resend";
import { sendEmailWithRetry, type SendEmailResult } from "@/lib/email/send-email";
import { renderTemplateWithOverride, renderCustomContent } from "@/lib/email/template-overrides";
import { isSystemTemplateKey, getSampleVariableValues } from "@/features/communications/services/email-template-admin.service";
import { TEMPLATE_CATEGORY } from "@/features/communications/config/template-catalog";
import { TEMPLATE_SAMPLE_PROPS } from "@/features/communications/config/template-sample-props";

/**
 * Renders any template key — one of the 51 system templates (with sample
 * props, override-aware) or a saved custom template (its own saved
 * content + the general sample variables) — with realistic placeholder
 * data. Backs the Email Templates catalog page's Preview action for every
 * row, system or custom.
 */
export async function previewTemplate(organizationId: string, templateKey: string) {
  if (isSystemTemplateKey(templateKey)) {
    return renderTemplateWithOverride(organizationId, templateKey, TEMPLATE_SAMPLE_PROPS[templateKey]);
  }

  const custom = await prisma.emailTemplate.findUnique({
    where: { organizationId_templateKey: { organizationId, templateKey } },
  });
  if (!custom) throw new Error("Template not found.");
  return renderCustomContent(custom, getSampleVariableValues(templateKey));
}

/**
 * Sends a real test email using sample props, bypassing the 51 typed
 * EmailService methods (none accept an arbitrary runtime template key) —
 * writes its own EmailLog row, subject prefixed "[TEST] " so it's clearly
 * distinguishable from a real send in the Email Center table. Works for
 * both system and saved custom templates, same override-aware rendering as
 * previewTemplate.
 */
export async function sendTestEmail(args: {
  templateKey: string;
  to: string;
  actorId: string;
  organizationId: string;
}): Promise<SendEmailResult> {
  const { templateKey, to, actorId, organizationId } = args;

  let subject: string;
  let html: string;
  let text: string;
  let category: EmailCategory;

  if (isSystemTemplateKey(templateKey)) {
    const rendered = await renderTemplateWithOverride(organizationId, templateKey, TEMPLATE_SAMPLE_PROPS[templateKey]);
    ({ subject, html, text } = rendered);
    category = TEMPLATE_CATEGORY[templateKey];
  } else {
    const custom = await prisma.emailTemplate.findUnique({
      where: { organizationId_templateKey: { organizationId, templateKey } },
    });
    if (!custom) return { sent: false, attempts: 0, reason: "Template not found." };
    const rendered = await renderCustomContent(custom, getSampleVariableValues(templateKey));
    ({ subject, html, text } = rendered);
    category = custom.category;
  }

  const testSubject = `[TEST] ${subject}`;
  const from = getEmailFrom();

  const log = await prisma.emailLog.create({
    data: {
      organizationId,
      to,
      recipientName: "Test send",
      subject: testSubject,
      template: templateKey,
      category,
      status: "QUEUED",
      from,
      html,
      text,
      sentById: actorId,
    },
  });

  const result = await sendEmailWithRetry({ to, subject: testSubject, html, text });
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

  return result;
}
