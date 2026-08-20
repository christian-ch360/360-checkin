import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { TemplateName } from "@/lib/email/email-types";

/**
 * True if this exact (organizationId, memberId, template) combination has
 * already been sent, or is mid-send, per EmailLog. The guard that makes a
 * retried caller (e.g. a re-run of approveApplicationAction) safe to call
 * again without double-sending a specific templated email — reuses EmailLog
 * as the dedupe ledger rather than introducing new state. QUEUED counts as
 * "already sent" too, not just SENT, so a retry that races an in-flight
 * send from the first call still doesn't fire a second one.
 */
export async function wasEmailAlreadySent(organizationId: string, memberId: string, template: TemplateName): Promise<boolean> {
  const existing = await prisma.emailLog.findFirst({
    where: { organizationId, memberId, template, status: { in: ["QUEUED", "SENT"] } },
    select: { id: true },
  });
  return existing !== null;
}
