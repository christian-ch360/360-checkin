import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { MembershipFeature, MembershipPlanFeatureValue } from "@prisma/client";
import { DEFAULT_MEMBERSHIP_FEATURES, DEFAULT_MEMBERSHIP_PACKAGES } from "@/features/membership-plans/config/membership-features.config";

export async function listFeatures(organizationId: string) {
  return prisma.membershipFeature.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/** Idempotent — creates the canonical feature catalog the first time an org has none. Safe to call repeatedly; never touches existing rows. */
export async function ensureDefaultMembershipFeatures(organizationId: string) {
  const existing = await prisma.membershipFeature.count({ where: { organizationId } });
  if (existing > 0) return listFeatures(organizationId);

  await prisma.membershipFeature.createMany({
    data: DEFAULT_MEMBERSHIP_FEATURES.map((f) => ({
      organizationId,
      key: f.key,
      label: f.label,
      description: f.description,
      valueType: f.valueType,
      resetPeriod: f.resetPeriod,
      sortOrder: f.sortOrder,
    })),
  });
  return listFeatures(organizationId);
}

/**
 * Idempotent — creates the 5 canonical CreatorHub360 packages (Basic through
 * Gold, exact names/prices per spec) with their structured feature values,
 * the first time an org has no CREATOR-targeted plan yet. Mirrors
 * ensureDefaultCreatorPlan's self-healing seed pattern; every value it
 * writes stays fully editable afterward via the admin package editor —
 * this function never runs again once at least one plan exists.
 */
export async function ensureDefaultCreatorPackages(organizationId: string) {
  const existing = await prisma.membershipPlan.findFirst({ where: { organizationId, appliesTo: "CREATOR" } });
  if (existing) return;

  const features = await ensureDefaultMembershipFeatures(organizationId);
  const featureByKey = new Map(features.map((f) => [f.key, f]));

  for (const pkg of DEFAULT_MEMBERSHIP_PACKAGES) {
    const plan = await prisma.membershipPlan.create({
      data: {
        organizationId,
        name: pkg.name,
        description: pkg.description,
        priceCents: pkg.priceCents,
        sortOrder: pkg.sortOrder,
        benefits: pkg.benefits,
        appliesTo: "CREATOR",
        isActive: true,
      },
    });

    for (const fv of pkg.features) {
      const feature = featureByKey.get(fv.key);
      if (!feature) continue;
      await prisma.membershipPlanFeatureValue.create({
        data: {
          planId: plan.id,
          featureId: feature.id,
          boolValue: fv.boolValue ?? null,
          numberValue: fv.numberValue ?? null,
          textValue: fv.textValue ?? null,
          isUnlimited: fv.isUnlimited ?? false,
          displayOverride: fv.displayOverride ?? null,
        },
      });
    }
  }
}

export type PlanFeatureValueWithFeature = MembershipPlanFeatureValue & { feature: MembershipFeature };

export async function getPlanFeatureValues(planId: string): Promise<PlanFeatureValueWithFeature[]> {
  return prisma.membershipPlanFeatureValue.findMany({
    where: { planId, feature: { isActive: true } },
    include: { feature: true },
    orderBy: { feature: { sortOrder: "asc" } },
  });
}

/** Auto-generates a display bullet from a feature+value when no displayOverride is set. Pure — no DB access. */
export function renderBenefitLine(value: Pick<MembershipPlanFeatureValue, "boolValue" | "numberValue" | "textValue" | "isUnlimited" | "displayOverride">, feature: Pick<MembershipFeature, "label" | "valueType">): string | null {
  if (value.displayOverride) return value.displayOverride;

  switch (feature.valueType) {
    case "BOOLEAN":
      return value.boolValue ? feature.label : null;
    case "TEXT":
      return value.textValue ? value.textValue : null;
    case "NUMBER":
      if (value.isUnlimited) return `Unlimited ${feature.label}`;
      if (value.numberValue == null) return null;
      return `${value.numberValue} ${feature.label}`;
  }
}

/** Structured feature bullets (rendered, in catalog order) + the plan's free-text extras — the single source the Member Dashboard and admin preview both render from. */
export async function getPlanBenefits(planId: string): Promise<string[]> {
  const [values, plan] = await Promise.all([
    getPlanFeatureValues(planId),
    prisma.membershipPlan.findUnique({ where: { id: planId }, select: { benefits: true } }),
  ]);

  const structured = values.map((v) => renderBenefitLine(v, v.feature)).filter((line): line is string => Boolean(line));
  return [...structured, ...(plan?.benefits ?? [])];
}

export type PlanBenefitLine = { key: string; label: string; statusLabel: string };

/**
 * Catalog-level entitlement label ("Unlimited" / "Included" / "8" / a text
 * value) for a feature value — pure, no usage data, no DB. This is what a
 * PACKAGE entitles a member to, independent of how much of it they've
 * consumed this period; see membership-usage.service.ts's getRemainingUsage
 * for the usage-aware version shown on the Member Dashboard. Used for
 * plan-to-plan comparison (Upgrade/Downgrade cards), where "what you'd get"
 * matters more than "what's left in the current period."
 */
export function renderEntitlementLabel(
  value: Pick<MembershipPlanFeatureValue, "boolValue" | "numberValue" | "textValue" | "isUnlimited">,
  feature: Pick<MembershipFeature, "valueType" | "resetPeriod">
): string | null {
  if (value.isUnlimited) return "Unlimited";

  switch (feature.valueType) {
    case "BOOLEAN":
      return value.boolValue ? "Included" : null;
    case "TEXT":
      return value.textValue || null;
    case "NUMBER": {
      if (value.numberValue == null) return null;
      const unit = feature.resetPeriod === "DAILY" ? "/day" : feature.resetPeriod === "MONTHLY" ? "/month" : "";
      return `${value.numberValue}${unit}`;
    }
  }
}

/** A plan's full set of entitlements (label + catalog-level status), for Super-Admin analytics previews and member-facing upgrade/downgrade comparison cards. */
export async function getPlanEntitlements(planId: string): Promise<PlanBenefitLine[]> {
  const values = await getPlanFeatureValues(planId);
  return values
    .map((v): PlanBenefitLine | null => {
      const statusLabel = renderEntitlementLabel(v, v.feature);
      if (!statusLabel) return null;
      return { key: v.feature.key, label: v.feature.label, statusLabel };
    })
    .filter((line): line is PlanBenefitLine => line !== null);
}

/** Reads a single feature's value for whichever plan a member is subscribed to — the primitive every access-control check builds on. Returns null if the member has no active subscription or the plan doesn't include that feature. */
export async function getMemberFeatureValue(memberId: string, featureKey: string): Promise<PlanFeatureValueWithFeature | null> {
  const subscription = await prisma.memberSubscription.findUnique({
    where: { memberId },
    select: { planId: true },
  });
  if (!subscription) return null;

  return prisma.membershipPlanFeatureValue.findFirst({
    where: { planId: subscription.planId, feature: { key: featureKey, isActive: true } },
    include: { feature: true },
  });
}
