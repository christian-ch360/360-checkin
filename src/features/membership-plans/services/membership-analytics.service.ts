import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { MembershipLifecycleEventType } from "@prisma/client";

/** Subscription statuses that count as "still paying" for MRR purposes — PAST_DUE is nominally owed, still within its grace window. */
const REVENUE_STATUSES = ["ACTIVE", "PAST_DUE"] as const;

export type MembershipAnalytics = {
  membersByPackage: { planId: string; planName: string; count: number }[];
  mrrCents: number;
  arrCents: number;
  activeCount: number;
  trialingCount: number;
  canceledCount: number;
  expiredCount: number;
  last30Days: { UPGRADED: number; DOWNGRADED: number; CANCELED: number; TRIAL_CONVERTED: number };
  allTime: Record<MembershipLifecycleEventType, number>;
  trialConversionRate: number | null;
  churnRate: number | null;
};

function zeroTotals(): Record<MembershipLifecycleEventType, number> {
  return {
    SUBSCRIBED: 0,
    TRIAL_CONVERTED: 0,
    UPGRADED: 0,
    DOWNGRADED: 0,
    CANCELED: 0,
    RESUMED: 0,
    EXPIRED: 0,
    PAST_DUE: 0,
  };
}

/**
 * Org-wide membership package analytics — Members by Package, MRR/ARR, and
 * lifecycle-derived Upgrades/Downgrades/Churn/Trial Conversions, all read
 * from MemberSubscription's current state plus MembershipLifecycleEvent,
 * the single append-only log every real transition is written to (see
 * membership-lifecycle-log.ts).
 */
export async function getMembershipAnalytics(organizationId: string): Promise<MembershipAnalytics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [subscriptions, last30Groups, allTimeGroups] = await Promise.all([
    prisma.memberSubscription.findMany({
      where: { member: { organizationId } },
      select: { status: true, planId: true, plan: { select: { name: true, priceCents: true } } },
    }),
    prisma.membershipLifecycleEvent.groupBy({
      by: ["type"],
      where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
      _count: { type: true },
    }),
    prisma.membershipLifecycleEvent.groupBy({
      by: ["type"],
      where: { organizationId },
      _count: { type: true },
    }),
  ]);

  const membersByPackageMap = new Map<string, { planId: string; planName: string; count: number }>();
  let mrrCents = 0;
  let activeCount = 0;
  let trialingCount = 0;
  let canceledCount = 0;
  let expiredCount = 0;

  for (const sub of subscriptions) {
    if (sub.status !== "EXPIRED") {
      const existing = membersByPackageMap.get(sub.planId);
      if (existing) existing.count++;
      else membersByPackageMap.set(sub.planId, { planId: sub.planId, planName: sub.plan.name, count: 1 });
    }

    if ((REVENUE_STATUSES as readonly string[]).includes(sub.status)) {
      mrrCents += sub.plan.priceCents;
      activeCount++;
    } else if (sub.status === "TRIALING") {
      trialingCount++;
    } else if (sub.status === "CANCELED") {
      canceledCount++;
    } else if (sub.status === "EXPIRED") {
      expiredCount++;
    }
  }

  const allTime = zeroTotals();
  for (const g of allTimeGroups) allTime[g.type] = g._count.type;

  const last30 = zeroTotals();
  for (const g of last30Groups) last30[g.type] = g._count.type;

  const trialConversionRate = allTime.SUBSCRIBED > 0 ? Math.round((allTime.TRIAL_CONVERTED / allTime.SUBSCRIBED) * 100) : null;

  const churnBase = activeCount + trialingCount + canceledCount + expiredCount;
  const churnRate = churnBase > 0 ? Math.round((allTime.EXPIRED / churnBase) * 100) : null;

  return {
    membersByPackage: Array.from(membersByPackageMap.values()).sort((a, b) => b.count - a.count),
    mrrCents,
    arrCents: mrrCents * 12,
    activeCount,
    trialingCount,
    canceledCount,
    expiredCount,
    last30Days: {
      UPGRADED: last30.UPGRADED,
      DOWNGRADED: last30.DOWNGRADED,
      CANCELED: last30.CANCELED,
      TRIAL_CONVERTED: last30.TRIAL_CONVERTED,
    },
    allTime,
    trialConversionRate,
    churnRate,
  };
}

/** Per-plan analytics for the package editor's "View package analytics" action. */
export async function getPlanAnalytics(organizationId: string, planId: string) {
  const plan = await prisma.membershipPlan.findFirst({ where: { id: planId, organizationId }, select: { priceCents: true } });
  if (!plan) return null;

  const [subscriberCount, lifecycleGroups] = await Promise.all([
    prisma.memberSubscription.count({ where: { planId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } } }),
    prisma.membershipLifecycleEvent.groupBy({
      by: ["type"],
      where: { organizationId, OR: [{ fromPlanId: planId }, { toPlanId: planId }] },
      _count: { type: true },
    }),
  ]);

  const totals = zeroTotals();
  for (const g of lifecycleGroups) totals[g.type] = g._count.type;

  return {
    subscriberCount,
    mrrContributionCents: subscriberCount * plan.priceCents,
    upgradesInto: totals.UPGRADED,
    downgradesInto: totals.DOWNGRADED,
  };
}
