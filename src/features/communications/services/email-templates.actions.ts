"use server";

import { z } from "zod";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { previewTemplate, sendTestEmail } from "@/features/communications/services/template-preview.service";

export type SendTestEmailResult = { success: true } | { success: false; error: string };

/** Works for any row in the catalog table, system or custom — previewTemplate itself resolves which content applies. */
export async function previewTemplateAction(templateKey: string) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) throw new Error("Not authorized.");
  return previewTemplate(actor.organizationId, templateKey);
}

const sendTestSchema = z.object({
  templateKey: z.string().min(1, "Unknown template"),
  to: z.string().email("Enter a valid email"),
});

export async function sendTestEmailAction(input: { templateKey: string; to: string }): Promise<SendTestEmailResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "communications.manage")) {
    return { success: false, error: "Only Super Admins can send test emails." };
  }

  const parsed = sendTestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await sendTestEmail({
    templateKey: parsed.data.templateKey,
    to: parsed.data.to,
    actorId: actor.id,
    organizationId: actor.organizationId,
  });

  if (!result.sent) return { success: false, error: `Send failed: ${result.reason ?? "unknown error"}` };
  return { success: true };
}
