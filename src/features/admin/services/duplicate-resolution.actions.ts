import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { normalizeEmail } from "@/lib/utils/email";

export type DuplicateResolutionResult = { success: true } | { success: false; error: string };

/**
 * The one mutation behind every resolution action in the workflow — "Keep
 * This Application", "Keep Approved + Mark Pending Duplicate", and a
 * single-application "Mark As Duplicate" are all just different callers of
 * this with a different `markDuplicateApplicationIds` list. `keepApplicationId`
 * is never modified — its status, and everything else about it, stays
 * exactly as it was; only the applications being marked duplicate change.
 * Never deletes anything, never touches an application outside the ids
 * explicitly passed in, and refuses to mark an already-APPROVED application
 * as a duplicate (an approved application is always the one to keep, never
 * the one marked away) or to touch applications from a different email —
 * both are safety rails against a UI bug silently doing the wrong thing.
 *
 * Deliberately takes `organizationId`/`resolvedByMemberId` rather than a
 * full actor object and never calls Next-only APIs (revalidatePath,
 * requireCurrentMember) — so this same function is reusable from one-time
 * backfill scripts (see prisma/backfill-duplicate-case-b.ts and
 * prisma/backfill-duplicate-case-c.ts) that run outside a Next request
 * context. The Duplicate Emails admin workflow that originally called this
 * through a "use server" wrapper has since been removed (every historical
 * duplicate-email group is resolved) — this function itself stays, since
 * the backfill scripts that document how each group was resolved still
 * import it.
 */
export async function resolveDuplicateGroup(
  organizationId: string,
  resolvedByMemberId: string | null,
  keepApplicationId: string,
  markDuplicateApplicationIds: string[],
  note?: string
): Promise<DuplicateResolutionResult> {
  const uniqueMarkIds = [...new Set(markDuplicateApplicationIds)];
  if (uniqueMarkIds.length === 0) {
    return { success: false, error: "Select at least one application to mark as duplicate." };
  }
  if (uniqueMarkIds.includes(keepApplicationId)) {
    return { success: false, error: "The kept application can't also be marked as its own duplicate." };
  }

  const keepApp = await prisma.membershipApplication.findFirst({
    where: { id: keepApplicationId, organizationId },
    select: { id: true, email: true },
  });
  if (!keepApp) return { success: false, error: "The application to keep wasn't found." };

  const toMark = await prisma.membershipApplication.findMany({
    where: { id: { in: uniqueMarkIds }, organizationId },
    select: { id: true, email: true, status: true },
  });
  if (toMark.length !== uniqueMarkIds.length) {
    return { success: false, error: "One or more applications weren't found." };
  }
  if (toMark.some((a) => a.status === "APPROVED")) {
    return { success: false, error: "An approved application can't be marked as a duplicate — keep it instead." };
  }
  const keepEmail = normalizeEmail(keepApp.email);
  if (toMark.some((a) => normalizeEmail(a.email) !== keepEmail)) {
    return { success: false, error: "All applications in a duplicate resolution must share the same email address." };
  }

  const trimmedNote = note?.trim() || null;
  const now = new Date();

  await prisma.$transaction(
    toMark.map((app) =>
      prisma.membershipApplication.update({
        where: { id: app.id },
        data: {
          status: "DUPLICATE",
          duplicateOfApplicationId: keepApplicationId,
          duplicateResolvedAt: now,
          duplicateResolvedByMemberId: resolvedByMemberId,
          duplicateResolutionNote: trimmedNote,
        },
      })
    )
  );

  await logAudit({
    organizationId,
    actorId: resolvedByMemberId,
    action: "application.marked_duplicate",
    entityType: "membership_application",
    entityId: keepApplicationId,
    after: { keptApplicationId: keepApplicationId, markedDuplicateIds: uniqueMarkIds, note: trimmedNote },
  });

  return { success: true };
}
