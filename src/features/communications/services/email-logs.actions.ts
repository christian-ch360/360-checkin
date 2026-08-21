"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { sendEmailWithRetry } from "@/lib/email/send-email";
import { getEmailLogDetail } from "@/features/communications/services/email-logs.service";

export type EmailLogActionResult = { success: true } | { success: false; error: string };

async function requireCommsManage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "communications.manage")) {
    throw new Error("Only Super Admins can perform this action.");
  }
  return actor;
}

const RETRYABLE_STATUSES = new Set(["FAILED", "BOUNCED", "COMPLAINED"]);

export async function fetchEmailLogDetail(id: string) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) throw new Error("Not authorized.");
  const log = await getEmailLogDetail(actor.organizationId, id);
  if (!log) throw new Error("Email log not found.");
  return log;
}

export async function retryEmailLogAction(id: string): Promise<EmailLogActionResult> {
  let actor;
  try {
    actor = await requireCommsManage();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const log = await prisma.emailLog.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!log) return { success: false, error: "Email log not found." };
  if (!RETRYABLE_STATUSES.has(log.status)) {
    return { success: false, error: "Only failed, bounced, or complained emails can be retried." };
  }
  if (!log.html || !log.text) {
    return { success: false, error: "Original content isn't available for this email (sent before Email Center tracked it)." };
  }

  const result = await sendEmailWithRetry({ to: log.to, subject: log.subject, html: log.html, text: log.text });
  const now = new Date();

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      status: result.sent ? "SENT" : "FAILED",
      providerId: result.providerId ?? null,
      error: result.sent ? null : (result.reason ?? null),
      attempts: { increment: result.attempts },
      deliveredAt: result.sent ? now : null,
      failedAt: result.sent ? null : now,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "email.retried",
    entityType: "email_log",
    entityId: log.id,
    before: { status: log.status },
    after: { status: result.sent ? "SENT" : "FAILED" },
  });

  revalidatePath("/admin/email-center");
  revalidatePath("/admin/email-center/archive");

  if (!result.sent) {
    return { success: false, error: `Retry failed: ${result.reason ?? "unknown error"}` };
  }
  return { success: true };
}

export async function deleteEmailLogAction(id: string): Promise<EmailLogActionResult> {
  let actor;
  try {
    actor = await requireCommsManage();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const log = await prisma.emailLog.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!log) return { success: false, error: "Email log not found." };

  await prisma.emailLog.delete({ where: { id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "email.log_deleted",
    entityType: "email_log",
    entityId: id,
    before: { to: log.to, subject: log.subject, template: log.template },
  });

  revalidatePath("/admin/email-center");
  revalidatePath("/admin/email-center/archive");
  return { success: true };
}
