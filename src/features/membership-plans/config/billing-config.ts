import type { MemberRole } from "@prisma/client";

/**
 * Single source of truth for "does this Role need a paid
 * membership." Only Creators do today; every other Role (Brand,
 * Agency, Broker, Business Development, Staff, Entertainment, Investor) is exempt. Centralized here so
 * eligibility can never drift between the auto-trial-grant step and the
 * premium-feature gate that checks it later.
 */
export function requiresMembership(role: MemberRole): boolean {
  return role === "CREATOR";
}

/**
 * Days a PAST_DUE subscription keeps access after currentPeriodEnd before
 * the lifecycle sweep expires it. One place to tune — see
 * subscription-lifecycle.service.ts and membership-gate.ts.
 */
export const GRACE_PERIOD_DAYS = 7;
