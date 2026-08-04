"use server";

import { addMonths } from "date-fns";
import { revalidatePath } from "next/cache";
import type { Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";

export type SubscriptionOverrideAction = "GRANT_COMPLIMENTARY" | "EXTEND_TRIAL" | "PAUSE" | "MANUALLY_ACTIVATE";

export type MembershipManagementActionResult = { success: true } | { success: false; error: string };

/**
 * The single write path for every Super-Admin billing override — the four
 * row actions in Membership Management (grant complimentary, extend trial,
 * pause, manually activate) are thin presets over this one function rather
 * than four near-duplicate actions, per the request's "remove duplicate
 * billing checks" instruction.
 */
export async function adminUpdateSubscription(
  memberId: string,
  action: SubscriptionOverrideAction,
  options: { extendTrialMonths?: number } = {},
): Promise<MembershipManagementActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "billing.override")) {
    return { success: false, error: "You don't have permission to override membership billing." };
  }

  const subscription = await prisma.memberSubscription.findUnique({
    where: { memberId },
    include: { member: true },
  });
  if (!subscription || subscription.member.organizationId !== actor.organizationId) {
    return { success: false, error: "Subscription not found." };
  }

  const now = new Date();
  let data: Prisma.MemberSubscriptionUpdateInput;

  switch (action) {
    case "GRANT_COMPLIMENTARY":
      data = { status: "ACTIVE", currentPeriodEnd: addMonths(now, 12), canceledAt: null, cancelAt: null };
      break;
    case "EXTEND_TRIAL": {
      const months = options.extendTrialMonths ?? 1;
      const base = subscription.trialEndsAt && subscription.trialEndsAt > now ? subscription.trialEndsAt : now;
      data = { status: "TRIALING", trialEndsAt: addMonths(base, months) };
      break;
    }
    case "PAUSE":
      data = { status: "CANCELED", canceledAt: now, cancelAt: now };
      break;
    case "MANUALLY_ACTIVATE":
      data = { status: "ACTIVE", currentPeriodEnd: addMonths(now, 1), canceledAt: null, cancelAt: null };
      break;
  }

  const before: SubscriptionStatus = subscription.status;
  await prisma.memberSubscription.update({ where: { id: subscription.id }, data });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: `membership.admin_override.${action.toLowerCase()}`,
    entityType: "member_subscription",
    entityId: subscription.id,
    before: { status: before },
    after: { status: data.status, memberId },
  });

  revalidatePath("/admin/membership-management");
  revalidatePath(`/members/${memberId}`);
  return { success: true };
}
