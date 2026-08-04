import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getEmailFrom } from "@/lib/email/resend";
import { sendEmailWithRetry, type SendEmailResult } from "@/lib/email/send-email";
import { renderTemplate, type TemplateName } from "@/lib/email/email-types";
import { TEMPLATE_CATEGORY } from "@/features/communications/config/template-catalog";
import { TEMPLATE_SAMPLE_PROPS } from "@/features/communications/config/template-sample-props";

/** Renders any template with realistic placeholder data — backs the Email Templates catalog page's Preview dialog. */
export async function previewTemplate(template: TemplateName) {
  return renderTemplate(template, TEMPLATE_SAMPLE_PROPS[template]);
}

/**
 * Sends a real test email using sample props, bypassing the 38 typed
 * EmailService methods (none accept an arbitrary runtime TemplateName) —
 * writes its own EmailLog row, subject prefixed "[TEST] " so it's clearly
 * distinguishable from a real send in the Email Center table.
 */
export async function sendTestEmail(args: {
  template: TemplateName;
  to: string;
  actorId: string;
  organizationId: string;
}): Promise<SendEmailResult> {
  const { template, to, actorId, organizationId } = args;
  const { subject, html, text } = await renderTemplate(template, TEMPLATE_SAMPLE_PROPS[template]);
  const testSubject = `[TEST] ${subject}`;
  const from = getEmailFrom();

  const log = await prisma.emailLog.create({
    data: {
      organizationId,
      to,
      recipientName: "Test send",
      subject: testSubject,
      template,
      category: TEMPLATE_CATEGORY[template],
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
