import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { MembershipFeatureResetPeriod } from "@prisma/client";
import { getMemberFeatureValue } from "@/features/membership-plans/services/membership-features.service";

export type UsageCheckResult = { allowed: true; remaining: number | null } | { allowed: false; reason: string };

/**
 * Server-computed period bucket for a reset-tracked benefit — "YYYY-MM-DD"
 * for DAILY, "YYYY-MM" for MONTHLY. Always derived from the real clock here,
 * never accepted from a caller, so usage can't be backdated or reset early.
 */
function periodKeyFor(resetPeriod: MembershipFeatureResetPeriod, at: Date = new Date()): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, "0");
  if (resetPeriod === "DAILY") {
    const d = String(at.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return `${y}-${m}`;
}

/** Whether a member's plan includes a non-consumable (BOOLEAN/TEXT/unlimited-NUMBER) benefit — the gate behind Board Room/Podcast Room/Lounge access. */
export async function hasFeatureAccess(memberId: string, featureKey: string): Promise<boolean> {
  const value = await getMemberFeatureValue(memberId, featureKey);
  if (!value) return false;
  switch (value.feature.valueType) {
    case "BOOLEAN":
      return Boolean(value.boolValue);
    case "TEXT":
      return Boolean(value.textValue);
    case "NUMBER":
      return value.isUnlimited || (value.numberValue ?? 0) > 0;
    default:
      return false;
  }
}

/** Remaining balance this reset period for a consumable benefit (guest passes, event credits) — the read side of the Member Dashboard's "Remaining Monthly Benefits." */
export async function getRemainingUsage(memberId: string, featureKey: string) {
  const value = await getMemberFeatureValue(memberId, featureKey);
  if (!value || value.feature.resetPeriod === "NONE") {
    return { included: false, isUnlimited: false, limit: null as number | null, used: 0, remaining: null as number | null };
  }
  if (value.isUnlimited) {
    return { included: true, isUnlimited: true, limit: null as number | null, used: 0, remaining: null as number | null };
  }

  const limit = value.numberValue ?? 0;
  if (limit <= 0) {
    return { included: false, isUnlimited: false, limit: 0, used: 0, remaining: 0 };
  }

  const period = periodKeyFor(value.feature.resetPeriod);
  const counter = await prisma.membershipUsageCounter.findUnique({
    where: { memberId_featureId_period: { memberId, featureId: value.featureId, period } },
  });
  const used = counter?.count ?? 0;
  return { included: true, isUnlimited: false, limit, used, remaining: Math.max(0, limit - used) };
}

/**
 * Atomically consumes `amount` units of a DAILY/MONTHLY-reset consumable
 * benefit if the member's remaining balance covers it — the primitive
 * behind the guest-pass self-service action and the networking-event-credit
 * auto-decrement on RSVP.
 */
export async function consumeUsage(memberId: string, featureKey: string, amount = 1): Promise<UsageCheckResult> {
  const value = await getMemberFeatureValue(memberId, featureKey);
  if (!value) return { allowed: false, reason: `Your membership package doesn't include ${featureKey.replace(/_/g, " ")}.` };
  if (value.feature.resetPeriod === "NONE") {
    return { allowed: false, reason: `${value.feature.label} isn't a consumable benefit.` };
  }

  const period = periodKeyFor(value.feature.resetPeriod);

  if (value.isUnlimited) {
    await prisma.membershipUsageCounter.upsert({
      where: { memberId_featureId_period: { memberId, featureId: value.featureId, period } },
      create: { memberId, featureId: value.featureId, period, count: amount },
      update: { count: { increment: amount } },
    });
    return { allowed: true, remaining: null };
  }

  const limit = value.numberValue ?? 0;
  if (limit <= 0) {
    return { allowed: false, reason: `Your membership package doesn't include ${value.feature.label}.` };
  }

  return prisma.$transaction(async (tx) => {
    const counter = await tx.membershipUsageCounter.upsert({
      where: { memberId_featureId_period: { memberId, featureId: value.featureId, period } },
      create: { memberId, featureId: value.featureId, period, count: 0 },
      update: {},
    });
    if (counter.count + amount > limit) {
      return { allowed: false, reason: `You've used all ${limit} of your ${value.feature.label.toLowerCase()} for this period.` };
    }
    await tx.membershipUsageCounter.update({ where: { id: counter.id }, data: { count: { increment: amount } } });
    return { allowed: true, remaining: limit - (counter.count + amount) };
  });
}
