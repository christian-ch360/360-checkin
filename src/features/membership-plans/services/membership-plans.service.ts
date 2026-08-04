import "server-only";

import type { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureDefaultCreatorPackages, getPlanEntitlements } from "@/features/membership-plans/services/membership-features.service";

/**
 * Active plans a member on `role` could self-service switch to
 * (Upgrade/Downgrade), cheapest first, each with its full catalog-level
 * entitlement list — this is what powers the upgrade/downgrade comparison
 * cards (diffing the target plan's entitlements against the member's
 * current plan, both drawn from this same list).
 */
export async function listSwitchablePlans(organizationId: string, role: MemberRole) {
  const plans = await prisma.membershipPlan.findMany({
    where: { organizationId, isActive: true, OR: [{ appliesTo: role }, { appliesTo: null }] },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, priceCents: true },
  });

  return Promise.all(
    plans.map(async (plan) => ({ ...plan, entitlements: await getPlanEntitlements(plan.id) }))
  );
}

/** Every not-yet-applied scheduled price change across the org's plans — the pending list shown next to each package's "Schedule price change" control. */
export async function listPendingPricingSchedules(organizationId: string) {
  return prisma.membershipPricingSchedule.findMany({
    where: { appliedAt: null, plan: { organizationId } },
    orderBy: { effectiveAt: "asc" },
  });
}

export async function listPlans(organizationId: string) {
  return prisma.membershipPlan.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { subscriptions: true } } },
  });
}

/**
 * The plan shown to prospective/new members for a given Role —
 * prefers a plan targeted at `role` (`appliesTo`), falls back to a generic
 * plan (`appliesTo: null`), lowest sortOrder first. Single source of truth
 * for "which plan is the current one," reused by both the public /apply
 * page and the approval flow's auto-subscribe step so they can never
 * disagree. Auto-seeds the default Creator plan the first time it's needed
 * (see ensureDefaultCreatorPlan) so a fresh environment never has to be
 * manually configured before Creator approvals can grant a trial.
 */
export async function getActivePlan(organizationId: string, role?: MemberRole) {
  const targeted = role
    ? await prisma.membershipPlan.findFirst({
        where: { organizationId, isActive: true, appliesTo: role },
        orderBy: { sortOrder: "asc" },
      })
    : null;
  if (targeted) return targeted;

  const generic = await prisma.membershipPlan.findFirst({
    where: { organizationId, isActive: true, appliesTo: null },
    orderBy: { sortOrder: "asc" },
  });
  if (generic) return generic;

  if (role === "CREATOR") return ensureDefaultCreatorPlan(organizationId);
  return null;
}

/**
 * Idempotent, self-healing: seeds the 5 canonical CreatorHub360 packages
 * (Basic through Gold) if no plan already targets Creators, then returns
 * whichever now has the lowest sortOrder — same "auto-provision on first
 * read" pattern as ensureAvatarBucket(). Every seeded value stays fully
 * editable afterward via /admin/membership-plans.
 */
export async function ensureDefaultCreatorPlan(organizationId: string) {
  await ensureDefaultCreatorPackages(organizationId);
  return prisma.membershipPlan.findFirst({
    where: { organizationId, isActive: true, appliesTo: "CREATOR" },
    orderBy: { sortOrder: "asc" },
  });
}
