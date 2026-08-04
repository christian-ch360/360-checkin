import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getPlanFeatureValues, renderEntitlementLabel } from "@/features/membership-plans/services/membership-features.service";
import { getRemainingUsage } from "@/features/membership-plans/services/membership-usage.service";

export type MemberBenefitStatus = {
  key: string;
  label: string;
  /** e.g. "6 / 8 Remaining", "Unlimited", "Included", or a TEXT feature's raw value. */
  statusLabel: string;
  /** True when statusLabel is a usage countdown ("X / Y Remaining") — lets the UI accent low-remaining benefits differently from static entitlements. */
  isCountdown: boolean;
  /** Raw remaining count for countdown benefits — lets action buttons (e.g. "Use a guest pass") gate on the number without re-parsing statusLabel. */
  remaining: number | null;
};

/**
 * Everything the Creator Dashboard's Membership tab needs — strictly
 * personal, scoped by memberId, mirrors my-analytics.service.ts's pattern.
 * Returns null if the member has no subscription yet (shouldn't happen for
 * an approved member post-backfill, but new members created outside the
 * approval flow — e.g. the founder bootstrap script — may not have one).
 * `benefitsRemaining` is read from the configurable feature catalog (see
 * membership-features.service.ts) rather than hardcoded anywhere — every
 * consumable, reset-tracked benefit shows the member's actual remaining
 * balance this period rather than just the package's static entitlement.
 */
export async function getMemberMembership(memberId: string) {
  const subscription = await prisma.memberSubscription.findUnique({
    where: { memberId },
    include: { plan: true, payments: { orderBy: { paidAt: "desc" }, take: 20 } },
  });
  if (!subscription) return null;

  const featureValues = await getPlanFeatureValues(subscription.planId);

  const benefitsRemaining = (
    await Promise.all(
      featureValues.map(async (v): Promise<MemberBenefitStatus | null> => {
        const feature = v.feature;
        if (feature.valueType === "NUMBER" && feature.resetPeriod !== "NONE" && !v.isUnlimited) {
          const usage = await getRemainingUsage(memberId, feature.key);
          if (!usage.included || usage.limit == null) return null;
          return {
            key: feature.key,
            label: feature.label,
            statusLabel: `${usage.remaining} / ${usage.limit} Remaining`,
            isCountdown: true,
            remaining: usage.remaining,
          };
        }
        const statusLabel = renderEntitlementLabel(v, feature);
        if (!statusLabel) return null;
        return { key: feature.key, label: feature.label, statusLabel, isCountdown: false, remaining: null };
      })
    )
  ).filter((b): b is MemberBenefitStatus => b !== null);

  return {
    id: subscription.id,
    status: subscription.status,
    memberSince: subscription.startedAt,
    trialEndsAt: subscription.trialEndsAt,
    renewalDate: subscription.currentPeriodEnd,
    cancelAt: subscription.cancelAt,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      priceCents: subscription.plan.priceCents,
      trialMonths: subscription.plan.trialMonths,
    },
    benefitsRemaining,
    // Free-text marketing bullets not tied to access control (e.g. "Community Access") — no quantity concept, shown as a plain list.
    additionalBenefits: subscription.plan.benefits,
    payments: subscription.payments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      paidAt: p.paidAt,
      note: p.note,
    })),
  };
}
