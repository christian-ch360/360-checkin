import "server-only";

import { render } from "@react-email/render";
import { prisma } from "@/lib/db/prisma";
import { renderTemplate, type TemplateName, type TemplateProps } from "@/lib/email/email-types";
import { flattenTemplateVariables, interpolateTemplate } from "@/lib/email/template-interpolation";
import { sanitizeEmailHtml, htmlToPlainText } from "@/lib/email/template-html-sanitize";
import { CustomHtmlEmail } from "@/emails/custom-html-email";

export type RenderedEmail = { subject: string; html: string; text: string };

/** Interpolates + sanitizes + wraps already-known-safe editor content (subject/previewText/bodyHtml) against a variable map — the one rendering path shared by saved-override sends, the editor's live preview, and "Send Test" from the editor. */
export async function renderCustomContent(
  content: { subject: string; previewText: string | null; bodyHtml: string },
  variables: Record<string, string>
): Promise<RenderedEmail> {
  const subject = interpolateTemplate(content.subject, variables);
  const preview = content.previewText ? interpolateTemplate(content.previewText, variables) : subject;
  const bodyHtml = sanitizeEmailHtml(interpolateTemplate(content.bodyHtml, variables));
  const html = await render(<CustomHtmlEmail preview={preview} bodyHtml={bodyHtml} />);
  return { subject, html, text: htmlToPlainText(bodyHtml) };
}

/** The only ACTIVE override for a template key, if any — DRAFT/INACTIVE rows never affect a real send. */
export async function getActiveTemplateOverride(organizationId: string, templateKey: string) {
  return prisma.emailTemplate.findFirst({
    where: { organizationId, templateKey, status: "ACTIVE" },
  });
}

/**
 * The single choke point every real EmailService send goes through instead
 * of calling renderTemplate directly. If an admin has activated an override
 * for this template key, its content is rendered (interpolated against the
 * exact same typed props the code template would have received — nothing
 * about the 69 call sites changes); otherwise this falls through to the
 * original React Email component, byte-for-byte the same as before this
 * feature existed.
 */
export async function renderTemplateWithOverride<K extends TemplateName>(
  organizationId: string,
  template: K,
  props: TemplateProps[K]
): Promise<RenderedEmail> {
  const override = await getActiveTemplateOverride(organizationId, template);
  if (!override) return renderTemplate(template, props);

  const variables = flattenTemplateVariables(props);
  return renderCustomContent(override, variables);
}
