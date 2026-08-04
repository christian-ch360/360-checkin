"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { membershipPlanSchema, type MembershipPlanInput } from "@/features/membership-plans/schemas/membership-plan.schema";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";

export type ActionResult = { success: true } | { success: false; error: string };

function parseBenefits(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function requireBillingManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "billing.manage")) {
    throw new Error("You don't have permission to manage membership plans.");
  }
  return actor;
}

export async function createPlan(input: MembershipPlanInput): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireBillingManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const parsed = membershipPlanSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const priceCents = Math.round(Number(data.priceDollars) * 100);
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { success: false, error: "Enter a valid price" };
  }

  const plan = await prisma.membershipPlan.create({
    data: {
      organizationId: actor.organizationId,
      name: data.name,
      description: data.description || null,
      priceCents,
      trialMonths: data.trialMonths ? Number(data.trialMonths) : 0,
      benefits: parseBenefits(data.benefits),
      isActive: data.isActive,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "membership_plan.created",
    entityType: "membership_plan",
    entityId: plan.id,
    after: { name: plan.name, priceCents: plan.priceCents },
  });

  revalidatePath("/admin/membership-plans");
  return { success: true };
}

export async function updatePlan(planId: string, input: MembershipPlanInput): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireBillingManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const plan = await prisma.membershipPlan.findFirst({ where: { id: planId, organizationId: actor.organizationId } });
  if (!plan) return { success: false, error: "Plan not found." };

  const parsed = membershipPlanSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const priceCents = Math.round(Number(data.priceDollars) * 100);
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { success: false, error: "Enter a valid price" };
  }

  await prisma.membershipPlan.update({
    where: { id: planId },
    data: {
      name: data.name,
      description: data.description || null,
      priceCents,
      trialMonths: data.trialMonths ? Number(data.trialMonths) : 0,
      benefits: parseBenefits(data.benefits),
      isActive: data.isActive,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "membership_plan.updated",
    entityType: "membership_plan",
    entityId: planId,
    before: { name: plan.name, priceCents: plan.priceCents, isActive: plan.isActive },
    after: { name: data.name, priceCents, isActive: data.isActive },
  });

  revalidatePath("/admin/membership-plans");
  return { success: true };
}

/** Swaps sortOrder with the adjacent plan — "reorder packages," no dedicated drag-and-drop needed for a 5-ish-item list. */
export async function reorderPlan(planId: string, direction: "up" | "down"): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireBillingManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const plans = await prisma.membershipPlan.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });
  const index = plans.findIndex((p) => p.id === planId);
  if (index === -1) return { success: false, error: "Plan not found." };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= plans.length) return { success: false, error: "Already at the edge." };

  const current = plans[index];
  const swap = plans[swapIndex];
  await prisma.$transaction([
    prisma.membershipPlan.update({ where: { id: current.id }, data: { sortOrder: swap.sortOrder } }),
    prisma.membershipPlan.update({ where: { id: swap.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  revalidatePath("/admin/membership-plans");
  return { success: true };
}

const featureValueSchema = z.object({
  boolValue: z.boolean().optional(),
  numberValue: z.number().int().optional(),
  textValue: z.string().optional(),
  isUnlimited: z.boolean().optional(),
  displayOverride: z.string().optional(),
});
export type FeatureValueInput = z.infer<typeof featureValueSchema>;

/** Upserts (or, if every field is empty, deletes) a plan's value for one feature — "Edit package benefits" without touching code. */
export async function setPlanFeatureValue(planId: string, featureId: string, input: FeatureValueInput): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireBillingManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const parsed = featureValueSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid value." };

  const plan = await prisma.membershipPlan.findFirst({ where: { id: planId, organizationId: actor.organizationId } });
  if (!plan) return { success: false, error: "Plan not found." };

  const feature = await prisma.membershipFeature.findFirst({ where: { id: featureId, organizationId: actor.organizationId } });
  if (!feature) return { success: false, error: "Feature not found." };

  const data = parsed.data;
  const isEmpty =
    data.boolValue === undefined &&
    data.numberValue === undefined &&
    !data.textValue &&
    !data.isUnlimited &&
    !data.displayOverride;

  if (isEmpty) {
    await prisma.membershipPlanFeatureValue.deleteMany({ where: { planId, featureId } });
  } else {
    await prisma.membershipPlanFeatureValue.upsert({
      where: { planId_featureId: { planId, featureId } },
      create: {
        planId,
        featureId,
        boolValue: data.boolValue ?? null,
        numberValue: data.numberValue ?? null,
        textValue: data.textValue || null,
        isUnlimited: data.isUnlimited ?? false,
        displayOverride: data.displayOverride || null,
      },
      update: {
        boolValue: data.boolValue ?? null,
        numberValue: data.numberValue ?? null,
        textValue: data.textValue || null,
        isUnlimited: data.isUnlimited ?? false,
        displayOverride: data.displayOverride || null,
      },
    });
  }

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "membership_plan.feature_value_set",
    entityType: "membership_plan",
    entityId: planId,
    after: { featureId, ...data },
  });

  revalidatePath("/admin/membership-plans");
  return { success: true };
}

const scheduleSchema = z.object({
  newPriceDollars: z.string().min(1, "Enter a price"),
  effectiveAt: z.string().min(1, "Pick a date"),
});

/** Queues a future price change ("Schedule future pricing changes") — applied by the daily subscription-lifecycle sweep once effectiveAt passes. */
export async function schedulePriceChange(planId: string, input: { newPriceDollars: string; effectiveAt: string }): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireBillingManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const newPriceCents = Math.round(Number(parsed.data.newPriceDollars) * 100);
  if (!Number.isFinite(newPriceCents) || newPriceCents < 0) return { success: false, error: "Enter a valid price" };

  const effectiveAt = new Date(parsed.data.effectiveAt);
  if (Number.isNaN(effectiveAt.getTime()) || effectiveAt <= new Date()) {
    return { success: false, error: "Pick a future date" };
  }

  const plan = await prisma.membershipPlan.findFirst({ where: { id: planId, organizationId: actor.organizationId } });
  if (!plan) return { success: false, error: "Plan not found." };

  await prisma.membershipPricingSchedule.create({
    data: { planId, newPriceCents, effectiveAt, createdById: actor.id },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "membership_plan.price_change_scheduled",
    entityType: "membership_plan",
    entityId: planId,
    after: { newPriceCents, effectiveAt: effectiveAt.toISOString() },
  });

  revalidatePath("/admin/membership-plans");
  return { success: true };
}

export async function cancelPricingSchedule(scheduleId: string): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireBillingManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const schedule = await prisma.membershipPricingSchedule.findFirst({
    where: { id: scheduleId, appliedAt: null, plan: { organizationId: actor.organizationId } },
  });
  if (!schedule) return { success: false, error: "Schedule not found." };

  await prisma.membershipPricingSchedule.delete({ where: { id: scheduleId } });

  revalidatePath("/admin/membership-plans");
  return { success: true };
}

export async function togglePlanActive(planId: string, isActive: boolean): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireBillingManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const plan = await prisma.membershipPlan.findFirst({ where: { id: planId, organizationId: actor.organizationId } });
  if (!plan) return { success: false, error: "Plan not found." };

  await prisma.membershipPlan.update({ where: { id: planId }, data: { isActive } });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: isActive ? "membership_plan.activated" : "membership_plan.deactivated",
    entityType: "membership_plan",
    entityId: planId,
    before: { isActive: plan.isActive },
    after: { isActive },
  });

  revalidatePath("/admin/membership-plans");
  return { success: true };
}
