"use server";

import { revalidatePath } from "next/cache";
import { collabPostSchema, type CollabPostInput } from "@/features/collab-hub/schemas/collab-post.schema";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/db/activity-log";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { requireActiveMembership } from "@/lib/permissions/membership-gate";
import { requireLegalCompliance } from "@/lib/permissions/legal-gate";
import { notifyMembers } from "@/lib/notifications";

export type CollabActionResult = { success: true; postId?: string } | { success: false; error: string };

export async function createCollabPost(input: CollabPostInput): Promise<CollabActionResult> {
  const actor = await requireCurrentMember();

  const membership = requireActiveMembership(actor);
  if (!membership.allowed) return { success: false, error: membership.reason! };

  const legal = await requireLegalCompliance(actor.organizationId, actor.id);
  if (!legal.allowed) return { success: false, error: legal.reason! };

  const parsed = collabPostSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const post = await prisma.collabPost.create({
    data: {
      organizationId: actor.organizationId,
      memberId: actor.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      budgetType: parsed.data.budgetType,
      budgetNote: parsed.data.budgetNote || null,
      dateNeeded: parsed.data.dateNeeded ? new Date(parsed.data.dateNeeded) : null,
      location: parsed.data.location,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      imageUrls: parsed.data.imageUrls ?? [],
      videoUrls: parsed.data.videoUrls ?? [],
    },
  });

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "collab_post.created",
    entityType: "collab_post",
    entityId: post.id,
    metadata: { title: post.title },
  });

  revalidatePath("/community/collabs");
  return { success: true, postId: post.id };
}

export async function updateCollabPostStatus(
  postId: string,
  status: "OPEN" | "CLOSED" | "FILLED"
): Promise<CollabActionResult> {
  const actor = await requireCurrentMember();

  const post = await prisma.collabPost.findFirst({
    where: { id: postId, organizationId: actor.organizationId },
  });
  if (!post) return { success: false, error: "Collaboration post not found." };

  const isOwner = post.memberId === actor.id;
  const isAdmin = hasPermission(actor.systemRole, "members.manage");
  if (!isOwner && !isAdmin) {
    return { success: false, error: "You don't have permission to update this post." };
  }

  await prisma.collabPost.update({ where: { id: postId }, data: { status } });

  if (status === "CLOSED" || status === "FILLED") {
    const pending = await prisma.application.findMany({
      where: { collabPostId: postId, status: "PENDING" },
      select: { id: true, applicantId: true },
    });

    if (pending.length > 0) {
      await prisma.application.updateMany({
        where: { id: { in: pending.map((a) => a.id) } },
        data: { status: "REJECTED", respondedAt: new Date() },
      });

      const notifiable = await prisma.member.findMany({
        where: { id: { in: pending.map((a) => a.applicantId) }, notifyCollabRequests: true },
        select: { id: true },
      });

      await notifyMembers(
        notifiable.map((m) => m.id),
        {
          type: "COLLAB_POST_CLOSED",
          title: "A collaboration you applied to was closed",
          body: post.title,
          link: `/community/collabs/${postId}`,
        }
      );
    }
  }

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "collab_post.status_changed",
    entityType: "collab_post",
    entityId: postId,
    metadata: { status },
  });

  revalidatePath("/community/collabs");
  revalidatePath(`/community/collabs/${postId}`);
  return { success: true };
}
