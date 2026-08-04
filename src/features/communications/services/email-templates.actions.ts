"use server";

import { z } from "zod";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import type { TemplateName } from "@/lib/email/email-types";
import { TEMPLATE_CATEGORY } from "@/features/communications/config/template-catalog";
import { previewTemplate, sendTestEmail } from "@/features/communications/services/template-preview.service";

export type SendTestEmailResult = { success: true } | { success: false; error: string };

export async function previewTemplateAction(template: string) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) throw new Error("Not authorized.");
  if (!(template in TEMPLATE_CATEGORY)) throw new Error("Unknown template.");
  return previewTemplate(template as TemplateName);
}

const sendTestSchema = z.object({
  template: z.string().refine((t): t is TemplateName => t in TEMPLATE_CATEGORY, "Unknown template"),
  to: z.string().email("Enter a valid email"),
});

export async function sendTestEmailAction(input: { template: string; to: string }): Promise<SendTestEmailResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "communications.manage")) {
    return { success: false, error: "Only Super Admins can send test emails." };
  }

  const parsed = sendTestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await sendTestEmail({
    template: parsed.data.template,
    to: parsed.data.to,
    actorId: actor.id,
    organizationId: actor.organizationId,
  });

  if (!result.sent) return { success: false, error: `Send failed: ${result.reason ?? "unknown error"}` };
  return { success: true };
}
