"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { membershipFeatureSchema, type MembershipFeatureInput } from "@/features/membership-plans/schemas/membership-feature.schema";

export type ActionResult = { success: true } | { success: false; error: string };
export type FeatureInput = MembershipFeatureInput;

/**
 * Structural changes to the feature catalog itself (new benefit types) are
 * Super-Admin-only per spec — distinct from per-package value edits, which
 * any billing.manage admin can already do via setPlanFeatureValue.
 */
async function requireFeatureCatalogManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "billing.override")) {
    throw new Error("Only Super Admins can edit the membership feature catalog.");
  }
  return actor;
}

export async function createFeature(input: FeatureInput): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireFeatureCatalogManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const parsed = membershipFeatureSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await prisma.membershipFeature.findUnique({
    where: { organizationId_key: { organizationId: actor.organizationId, key: parsed.data.key } },
  });
  if (existing) return { success: false, error: "A feature with this key already exists." };

  const maxSortOrder = await prisma.membershipFeature.aggregate({
    where: { organizationId: actor.organizationId },
    _max: { sortOrder: true },
  });

  const feature = await prisma.membershipFeature.create({
    data: {
      organizationId: actor.organizationId,
      key: parsed.data.key,
      label: parsed.data.label,
      description: parsed.data.description || null,
      valueType: parsed.data.valueType,
      resetPeriod: parsed.data.resetPeriod,
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 10,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "membership_feature.created",
    entityType: "membership_feature",
    entityId: feature.id,
    after: { key: feature.key, label: feature.label },
  });

  revalidatePath("/admin/membership-plans");
  return { success: true };
}

export async function updateFeature(featureId: string, input: FeatureInput): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireFeatureCatalogManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const feature = await prisma.membershipFeature.findFirst({ where: { id: featureId, organizationId: actor.organizationId } });
  if (!feature) return { success: false, error: "Feature not found." };

  const parsed = membershipFeatureSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (parsed.data.key !== feature.key) {
    const keyTaken = await prisma.membershipFeature.findUnique({
      where: { organizationId_key: { organizationId: actor.organizationId, key: parsed.data.key } },
    });
    if (keyTaken) return { success: false, error: "A feature with this key already exists." };
  }

  await prisma.membershipFeature.update({
    where: { id: featureId },
    data: {
      key: parsed.data.key,
      label: parsed.data.label,
      description: parsed.data.description || null,
      valueType: parsed.data.valueType,
      resetPeriod: parsed.data.resetPeriod,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "membership_feature.updated",
    entityType: "membership_feature",
    entityId: featureId,
    before: { key: feature.key, label: feature.label },
    after: { key: parsed.data.key, label: parsed.data.label },
  });

  revalidatePath("/admin/membership-plans");
  return { success: true };
}

export async function toggleFeatureActive(featureId: string, isActive: boolean): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireFeatureCatalogManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const feature = await prisma.membershipFeature.findFirst({ where: { id: featureId, organizationId: actor.organizationId } });
  if (!feature) return { success: false, error: "Feature not found." };

  await prisma.membershipFeature.update({ where: { id: featureId }, data: { isActive } });

  revalidatePath("/admin/membership-plans");
  return { success: true };
}

export async function reorderFeature(featureId: string, direction: "up" | "down"): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireFeatureCatalogManager();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const features = await prisma.membershipFeature.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });
  const index = features.findIndex((f) => f.id === featureId);
  if (index === -1) return { success: false, error: "Feature not found." };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= features.length) return { success: false, error: "Already at the edge." };

  const current = features[index];
  const swap = features[swapIndex];
  await prisma.$transaction([
    prisma.membershipFeature.update({ where: { id: current.id }, data: { sortOrder: swap.sortOrder } }),
    prisma.membershipFeature.update({ where: { id: swap.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  revalidatePath("/admin/membership-plans");
  return { success: true };
}
