"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  projectSchema,
  taskSchema,
  assignmentSchema,
  type ProjectInput,
  type TaskInput,
  type AssignmentInput,
} from "@/features/projects/schemas/project.schema";
import { generateProjectCode } from "@/features/projects/services/project-code";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/db/activity-log";
import { logAudit } from "@/lib/db/audit-log";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";

export type ActionResult = { success: true } | { success: false; error: string };
export type CreateProjectResult =
  | { success: true; projectId: string }
  | { success: false; error: string };

export async function createProject(input: ProjectInput): Promise<CreateProjectResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to create projects." };
  }

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const projectCode = await generateProjectCode();
  const project = await prisma.project.create({
    data: {
      organizationId: actor.organizationId,
      projectCode,
      name: data.name,
      description: data.description || null,
      clientId: data.clientId || null,
      brandId: data.brandId || null,
      status: data.status,
      deadline: data.deadline ? new Date(data.deadline) : null,
      projectLeaderId: data.projectLeaderId || null,
      budget: data.budget ? Number(data.budget) : 0,
    },
  });

  await ensureQRAsset({ type: "PROJECT", projectId: project.id });
  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "project.created",
    entityType: "project",
    entityId: project.id,
    metadata: { name: project.name },
  });

  revalidatePath("/projects");
  return { success: true, projectId: project.id };
}

export async function updateProject(projectId: string, input: ProjectInput): Promise<ActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to edit projects." };
  }

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const before = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { status: true, name: true },
  });
  if (!before) return { success: false, error: "Project not found." };

  await prisma.project.update({
    where: { id: projectId, organizationId: actor.organizationId },
    data: {
      name: data.name,
      description: data.description || null,
      clientId: data.clientId || null,
      brandId: data.brandId || null,
      status: data.status,
      deadline: data.deadline ? new Date(data.deadline) : null,
      projectLeaderId: data.projectLeaderId || null,
      budget: data.budget ? Number(data.budget) : 0,
    },
  });

  if (data.status === "COMPLETED" && before.status !== "COMPLETED") {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "project.completed",
      entityType: "project",
      entityId: projectId,
      before: { status: before.status },
      after: { status: "COMPLETED" },
    });
    await notifyAssignees(projectId, data.name, "project_completed", actor.organizationId);
  }

  if (data.status === "ACTIVE" && before.status === "PLANNING") {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "project.approved",
      entityType: "project",
      entityId: projectId,
      before: { status: before.status },
      after: { status: "ACTIVE" },
    });
    await notifyAssignees(projectId, data.name, "project_approved", actor.organizationId);
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

async function notifyAssignees(
  projectId: string,
  projectName: string,
  kind: "project_approved" | "project_completed",
  organizationId: string
) {
  const assignees = await prisma.member.findMany({
    where: { projectAssignments: { some: { projectId } } },
    select: { id: true, email: true, fullName: true },
  });
  if (assignees.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const projectUrl = `${appUrl}/projects/${projectId}`;
  const notificationType = kind === "project_approved" ? "PROJECT_ASSIGNED" : "DEADLINE";
  const title = kind === "project_approved" ? `${projectName} is now active` : `${projectName} is complete`;

  for (const assignee of assignees) {
    await createNotification(assignee.id, { type: notificationType, title, link: `/projects/${projectId}` });
    if (kind === "project_approved") {
      await EmailService.sendProjectApprovedEmail({
        to: assignee.email,
        fullName: assignee.fullName,
        projectName,
        projectUrl,
        organizationId,
        memberId: assignee.id,
      });
    } else {
      await EmailService.sendProjectCompletedEmail({
        to: assignee.email,
        fullName: assignee.fullName,
        projectName,
        projectUrl,
        organizationId,
        memberId: assignee.id,
      });
    }
  }
}

export async function addAssignment(projectId: string, input: AssignmentInput): Promise<ActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to manage assignments." };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { id: true, name: true },
  });
  if (!project) return { success: false, error: "Project not found." };

  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  try {
    await prisma.projectAssignment.create({
      data: {
        projectId,
        memberId: data.memberId,
        role: data.role,
        commissionPct: data.commissionPct ? Number(data.commissionPct) : 0,
        contributionPct: data.contributionPct ? Number(data.contributionPct) : 0,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "This member is already assigned to the project." };
    }
    throw error;
  }

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "project.assigned",
    entityType: "project",
    entityId: projectId,
    metadata: { assignedMemberId: data.memberId },
  });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "project.assigned",
    entityType: "project",
    entityId: projectId,
    after: { assignedMemberId: data.memberId, role: data.role },
  });

  const assignee = await prisma.member.findUnique({
    where: { id: data.memberId },
    select: { notifyProjectInvites: true },
  });
  if (assignee?.notifyProjectInvites) {
    await createNotification(data.memberId, {
      type: "PROJECT_ASSIGNED",
      title: "Added to a project",
      body: `You were assigned to ${project.name}.`,
      link: `/projects/${projectId}`,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function removeAssignment(projectId: string, assignmentId: string): Promise<ActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to manage assignments." };
  }

  const assignment = await prisma.projectAssignment.findFirst({
    where: { id: assignmentId, projectId, project: { organizationId: actor.organizationId } },
    select: { id: true },
  });
  if (!assignment) return { success: false, error: "Assignment not found." };

  await prisma.projectAssignment.delete({ where: { id: assignment.id } });
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function createTask(projectId: string, input: TaskInput): Promise<ActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to manage tasks." };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!project) return { success: false, error: "Project not found." };

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  await prisma.task.create({
    data: {
      projectId: project.id,
      title: data.title,
      description: data.description || null,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);

export async function updateTaskStatus(projectId: string, taskId: string, status: string): Promise<ActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to manage tasks." };
  }

  const parsed = taskStatusSchema.safeParse(status);
  if (!parsed.success) return { success: false, error: "Invalid status" };

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId, project: { organizationId: actor.organizationId } },
    select: { id: true },
  });
  if (!task) return { success: false, error: "Task not found." };

  await prisma.task.update({ where: { id: task.id }, data: { status: parsed.data } });
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function addNote(projectId: string, body: string): Promise<ActionResult> {
  const actor = await requireCurrentMember();
  if (!body.trim()) return { success: false, error: "Note cannot be empty" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!project) return { success: false, error: "Project not found." };

  await prisma.note.create({
    data: { projectId: project.id, authorId: actor.id, body: body.trim() },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
