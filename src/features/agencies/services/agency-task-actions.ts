"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { createNotification } from "@/lib/notifications";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canDeleteTask, canManageTasks } from "@/features/agencies/config/agency-permissions";
import type { TaskPriority } from "@prisma/client";

export type AgencyTaskActionResult = { success: true; taskId?: string } | { success: false; error: string };

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});

async function requireTaskManager() {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  if (!canManageTasks(actor.agencyRole)) {
    return { actor, agencyId, allowed: false as const, error: "You don't have permission to manage tasks." };
  }
  return { actor, agencyId, allowed: true as const };
}

export async function createCampaignTask(campaignId: string, input: z.infer<typeof taskSchema>): Promise<AgencyTaskActionResult> {
  const check = await requireTaskManager();
  if (!check.allowed) return { success: false, error: check.error };

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!campaign) return { success: false, error: "Campaign not found." };

  const task = await prisma.task.create({
    data: {
      campaignId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority as TaskPriority,
      assigneeId: parsed.data.assigneeId || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });

  if (parsed.data.assigneeId) {
    await createNotification(parsed.data.assigneeId, {
      type: "TASK_ASSIGNED",
      title: `New task on "${campaign.title}": ${parsed.data.title}`,
      link: "/agency/campaigns",
    });
  }

  revalidatePath(`/agency/campaigns/${campaignId}`);
  return { success: true, taskId: task.id };
}

const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);

export async function updateCampaignTaskStatus(taskId: string, status: string): Promise<AgencyTaskActionResult> {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);

  const parsed = taskStatusSchema.safeParse(status);
  if (!parsed.success) return { success: false, error: "Invalid status" };

  const task = await prisma.task.findFirst({ where: { id: taskId, campaign: { organizationId: actor.organizationId, agencyId } } });
  if (!task) return { success: false, error: "Task not found." };
  // Assignee can move their own task; anyone else needs manage permission.
  if (task.assigneeId !== actor.id && !canManageTasks(actor.agencyRole)) {
    return { success: false, error: "You don't have permission to update this task." };
  }

  await prisma.task.update({ where: { id: taskId }, data: { status: parsed.data } });
  revalidatePath(`/agency/campaigns/${task.campaignId}`);
  return { success: true, taskId };
}

export async function deleteCampaignTask(taskId: string): Promise<AgencyTaskActionResult> {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  if (!canDeleteTask(actor.agencyRole)) return { success: false, error: "You don't have permission to delete tasks." };

  const task = await prisma.task.findFirst({ where: { id: taskId, campaign: { organizationId: actor.organizationId, agencyId } } });
  if (!task) return { success: false, error: "Task not found." };

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/agency/campaigns/${task.campaignId}`);
  return { success: true };
}

const taskCommentSchema = z.object({ body: z.string().trim().min(1, "Comment can't be empty").max(1000) });

export async function addCampaignTaskComment(taskId: string, body: string): Promise<AgencyTaskActionResult> {
  const actor = await requireCurrentMember();

  const parsed = taskCommentSchema.safeParse({ body });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const task = await prisma.task.findFirst({ where: { id: taskId, campaign: { organizationId: actor.organizationId } } });
  if (!task) return { success: false, error: "Task not found." };

  await prisma.comment.create({ data: { taskId, memberId: actor.id, body: parsed.data.body } });

  if (task.assigneeId && task.assigneeId !== actor.id) {
    await createNotification(task.assigneeId, {
      type: "COMMENT",
      title: `${actor.fullName} commented on "${task.title}"`,
      link: "/agency/campaigns",
    });
  }

  revalidatePath(`/agency/campaigns/${task.campaignId}`);
  return { success: true, taskId };
}
