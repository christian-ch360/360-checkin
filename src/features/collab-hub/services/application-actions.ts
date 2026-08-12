"use server";

import { revalidatePath } from "next/cache";
import { applicationSchema, type ApplicationInput } from "@/features/collab-hub/schemas/application.schema";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/db/activity-log";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { createNotification } from "@/lib/notifications";

export type ApplicationActionResult = { success: true } | { success: false; error: string };

export async function applyToPost(postId: string, input: ApplicationInput): Promise<ApplicationActionResult> {
  const actor = await requireCurrentMember();

  const post = await prisma.collabPost.findFirst({
    where: { id: postId, organizationId: actor.organizationId },
  });
  if (!post) return { success: false, error: "Collaboration post not found." };
  if (post.memberId === actor.id) return { success: false, error: "You can't apply to your own post." };
  if (post.status !== "OPEN") return { success: false, error: "This collaboration is no longer open." };

  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await prisma.application.findUnique({
    where: { collabPostId_applicantId: { collabPostId: postId, applicantId: actor.id } },
  });
  if (existing) return { success: false, error: "You've already applied to this collaboration." };

  await prisma.application.create({
    data: {
      collabPostId: postId,
      applicantId: actor.id,
      message: parsed.data.message || null,
    },
  });

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "collab_application.created",
    entityType: "collab_post",
    entityId: postId,
  });

  const poster = await prisma.member.findUnique({
    where: { id: post.memberId },
    select: { notifyCollabRequests: true },
  });
  if (poster?.notifyCollabRequests) {
    await createNotification(post.memberId, {
      type: "COLLAB_APPLICATION_RECEIVED",
      title: "New application received",
      body: `${actor.fullName} applied to "${post.title}"`,
      link: `/community/collabs/${postId}`,
    });
  }

  revalidatePath(`/community/collabs/${postId}`);
  return { success: true };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "ACCEPTED" | "REJECTED"
): Promise<ApplicationActionResult> {
  const actor = await requireCurrentMember();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { collabPost: true },
  });
  if (!application || application.collabPost.organizationId !== actor.organizationId) {
    return { success: false, error: "Application not found." };
  }
  if (application.collabPost.memberId !== actor.id) {
    return { success: false, error: "You don't have permission to respond to this application." };
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { status, respondedAt: new Date() },
  });

  if (status === "ACCEPTED") {
    const applicant = await prisma.member.findUnique({
      where: { id: application.applicantId },
      select: { notifyCollabRequests: true },
    });
    if (applicant?.notifyCollabRequests) {
      await createNotification(application.applicantId, {
        type: "COLLAB_APPLICATION_ACCEPTED",
        title: "Your application was accepted",
        body: application.collabPost.title,
        link: `/community/collabs/${application.collabPostId}`,
      });
    }
  }

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "collab_application.status_changed",
    entityType: "collab_application",
    entityId: applicationId,
    metadata: { status },
  });

  revalidatePath(`/community/collabs/${application.collabPostId}`);
  return { success: true };
}
