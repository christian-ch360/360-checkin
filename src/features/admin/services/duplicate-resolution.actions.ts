"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { normalizeEmail } from "@/lib/utils/email";

export type DuplicateResolutionResult = { success: true } | { success: false; error: string };

async function requireDuplicateResolver() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    throw new Error("You don't have permission to resolve duplicate applications.");
  }
  return actor;
}

function revalidateDuplicateSurfaces(applicationIds: string[]) {
  revalidatePath("/admin/duplicate-emails");
  revalidatePath("/admin/applications");
  for (const id of applicationIds) revalidatePath(`/admin/applications/${id}`);
}

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
 * backfill scripts (see prisma/backfill-duplicate-case-b.ts) that run
 * outside a Next request context, not just from resolveDuplicateGroupAction.
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

export async function resolveDuplicateGroupAction(
  keepApplicationId: string,
  markDuplicateApplicationIds: string[],
  note?: string
): Promise<DuplicateResolutionResult> {
  let actor;
  try {
    actor = await requireDuplicateResolver();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const result = await resolveDuplicateGroup(actor.organizationId, actor.id, keepApplicationId, markDuplicateApplicationIds, note);
  if (result.success) revalidateDuplicateSurfaces([keepApplicationId, ...markDuplicateApplicationIds]);
  return result;
}
