import type { MemberRole, SubscriptionStatus } from "@prisma/client";
import { requiresMembership, GRACE_PERIOD_DAYS } from "@/features/membership-plans/config/billing-config";

type GatedMember = {
  role: MemberRole;
  subscription: { status: SubscriptionStatus; currentPeriodEnd: Date | null; cancelAt: Date | null } | null;
};

function isWithinGracePeriod(currentPeriodEnd: Date | null): boolean {
  if (!currentPeriodEnd) return false;
  const graceEndsAt = new Date(currentPeriodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  return new Date() <= graceEndsAt;
}

/**
 * Whether this member currently has access to premium Creator features.
 * Non-Creator Roles are always true (membership doesn't apply to them —
 * see requiresMembership). For Creators: TRIALING/ACTIVE always have
 * access; PAST_DUE keeps access only within the grace period; CANCELED
 * keeps access until the scheduled cancelAt date; EXPIRED never does.
 */
export function hasActiveMembership(member: GatedMember): boolean {
  if (!requiresMembership(member.role)) return true;

  const sub = member.subscription;
  if (!sub) return false;

  switch (sub.status) {
    case "TRIALING":
    case "ACTIVE":
      return true;
    case "PAST_DUE":
      return isWithinGracePeriod(sub.currentPeriodEnd);
    case "CANCELED":
      return sub.cancelAt != null && new Date() < sub.cancelAt;
    case "EXPIRED":
      return false;
    default:
      return false;
  }
}

/** Same rule as hasActiveMembership, shaped for direct use inside server actions. */
export function requireActiveMembership(member: GatedMember): { allowed: boolean; reason?: string } {
  if (hasActiveMembership(member)) return { allowed: true };
  return {
    allowed: false,
    reason: "Your CreatorHub360 membership isn't active. Renew your membership to continue.",
  };
}
