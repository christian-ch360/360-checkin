"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/db/activity-log";
import { logAudit } from "@/lib/db/audit-log";
import { createNotification } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";

export type ProjectActionResult = { success: true } | { success: false; error: string };

export async function requestToJoinProject(projectId: string, message?: string): Promise<ProjectActionResult> {
  const actor = await requireCurrentMember();

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { id: true, name: true, projectLeaderId: true },
  });
  if (!project) return { success: false, error: "Project not found." };

  const alreadyAssigned = await prisma.projectAssignment.findUnique({
    where: { projectId_memberId: { projectId, memberId: actor.id } },
  });
  if (alreadyAssigned) return { success: false, error: "You're already on this project." };

  const existing = await prisma.projectCollaborationRequest.findUnique({
    where: { projectId_memberId: { projectId, memberId: actor.id } },
  });
  if (existing && existing.status === "PENDING") {
    return { success: false, error: "You already have a pending request for this project." };
  }

  const request = existing
    ? await prisma.projectCollaborationRequest.update({
        where: { id: existing.id },
        data: { status: "PENDING", message: message?.trim() || null, respondedAt: null },
      })
    : await prisma.projectCollaborationRequest.create({
        data: { projectId, memberId: actor.id, message: message?.trim() || null },
      });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const projectUrl = `${appUrl}/projects/${projectId}`;

  const recipients = await prisma.member.findMany({
    where: {
      organizationId: actor.organizationId,
      OR: [{ id: project.projectLeaderId ?? undefined }, { systemRole: { in: ["ADMIN", "SUPER_ADMIN"] } }],
    },
    select: { id: true, email: true, fullName: true, organizationId: true },
  });

  for (const recipient of recipients) {
    await createNotification(recipient.id, {
      type: "PROJECT_ASSIGNED",
      title: `${actor.fullName} wants to join ${project.name}`,
      body: request.message ?? undefined,
      link: `/projects/${projectId}`,
    });
    await EmailService.sendCollaborationRequestEmail({
      to: recipient.email,
      fullName: recipient.fullName,
      requesterName: actor.fullName,
      projectName: project.name,
      message: request.message,
      projectUrl,
      organizationId: recipient.organizationId,
      memberId: recipient.id,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function acceptCollaborationRequest(requestId: string): Promise<ProjectActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to manage this project." };
  }

  const request = await prisma.projectCollaborationRequest.findFirst({
    where: { id: requestId, project: { organizationId: actor.organizationId } },
    include: { project: true },
  });
  if (!request) return { success: false, error: "Request not found." };
  if (request.status !== "PENDING") return { success: false, error: "This request has already been resolved." };

  await prisma.$transaction([
    prisma.projectCollaborationRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    prisma.projectAssignment.upsert({
      where: { projectId_memberId: { projectId: request.projectId, memberId: request.memberId } },
      create: { projectId: request.projectId, memberId: request.memberId, role: "Collaborator" },
      update: {},
    }),
  ]);

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "project.collaboration_accepted",
    entityType: "project",
    entityId: request.projectId,
    metadata: { memberId: request.memberId },
  });

  await createNotification(request.memberId, {
    type: "COLLAB_APPLICATION_ACCEPTED",
    title: `You've joined ${request.project.name}`,
    link: `/projects/${request.projectId}`,
  });

  revalidatePath(`/projects/${request.projectId}`);
  return { success: true };
}

export async function rejectCollaborationRequest(requestId: string): Promise<ProjectActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to manage this project." };
  }

  const request = await prisma.projectCollaborationRequest.findFirst({
    where: { id: requestId, project: { organizationId: actor.organizationId } },
  });
  if (!request) return { success: false, error: "Request not found." };
  if (request.status !== "PENDING") return { success: false, error: "This request has already been resolved." };

  await prisma.projectCollaborationRequest.update({
    where: { id: request.id },
    data: { status: "REJECTED", respondedAt: new Date() },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "project.collaboration_rejected",
    entityType: "project_collaboration_request",
    entityId: request.id,
  });

  revalidatePath(`/projects/${request.projectId}`);
  return { success: true };
}
