"use server";

import { revalidatePath } from "next/cache";
import { feedbackSchema, feedbackStatusValues, type FeedbackInput } from "@/features/feedback/schemas/feedback.schema";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/db/activity-log";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

export type FeedbackActionResult = { success: true } | { success: false; error: string };

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackActionResult> {
  const actor = await requireCurrentMember();

  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const feedback = await prisma.feedback.create({
    data: {
      organizationId: actor.organizationId,
      memberId: actor.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      body: parsed.data.body,
    },
  });

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "feedback.submitted",
    entityType: "feedback",
    entityId: feedback.id,
    metadata: { subject: feedback.subject },
  });

  const triagers = await prisma.member.findMany({
    where: {
      organizationId: actor.organizationId,
      systemRole: { in: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
    },
    select: { id: true },
  });

  if (triagers.length > 0) {
    await prisma.notification.createMany({
      data: triagers.map((t) => ({
        memberId: t.id,
        type: "FEEDBACK_SUBMITTED" as const,
        title: "New feedback submitted",
        body: feedback.subject,
        link: "/feedback",
      })),
    });
  }

  revalidatePath("/feedback");
  return { success: true };
}

const statusSchema = z.enum(feedbackStatusValues);

export async function updateFeedbackStatus(feedbackId: string, status: string): Promise<FeedbackActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "feedback.manage")) {
    return { success: false, error: "You don't have permission to triage feedback." };
  }

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { success: false, error: "Invalid status" };

  await prisma.feedback.update({
    where: { id: feedbackId, organizationId: actor.organizationId },
    data: { status: parsed.data },
  });

  revalidatePath("/feedback");
  return { success: true };
}
