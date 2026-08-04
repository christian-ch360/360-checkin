"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { EmailService } from "@/lib/email/email-service";
import { generateInvitationToken, defaultInvitationExpiry } from "@/features/admin/services/invitations.service";

export type ProjectActionResult = { success: true } | { success: false; error: string };

const inviteBrandSchema = z.object({
  email: z.string().email("Enter a valid email"),
  roleLabel: z.string().trim().min(1, "Enter a role"),
});

export async function inviteBrandToProject(
  projectId: string,
  input: z.infer<typeof inviteBrandSchema>
): Promise<ProjectActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "projects.manage")) {
    return { success: false, error: "You don't have permission to invite collaborators." };
  }

  const parsed = inviteBrandSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { id: true, name: true, brandId: true },
  });
  if (!project) return { success: false, error: "Project not found." };

  const invitation = await prisma.projectInvitation.create({
    data: {
      organizationId: actor.organizationId,
      projectId: project.id,
      brandId: project.brandId,
      email: parsed.data.email,
      roleLabel: parsed.data.roleLabel,
      invitedById: actor.id,
      token: generateInvitationToken(),
      expiresAt: defaultInvitationExpiry(),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const result = await EmailService.sendBrandInvitationEmail({
    to: invitation.email,
    projectName: project.name,
    roleLabel: invitation.roleLabel,
    inviteUrl: `${appUrl}/project-invite/${invitation.token}`,
    expiresAt: invitation.expiresAt,
    organizationId: actor.organizationId,
  });

  if (!result.sent) {
    const reason = result.reason === "not_configured" ? "no email provider is configured" : result.reason;
    return { success: false, error: `Invitation was created, but the email could not be sent (${reason}).` };
  }

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "project.brand_invited",
    entityType: "project_invitation",
    entityId: invitation.id,
    after: { projectId: project.id, email: invitation.email, roleLabel: invitation.roleLabel },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export type AcceptProjectInvitationResult =
  | { success: true; projectName: string }
  | { success: false; error: string };

/**
 * Public accept action — no auth required, mirrors the org-invite pattern.
 * Only flips the invitation to ACCEPTED; an admin still finishes adding the
 * brand contact as a ProjectAssignment once they have a real account, same
 * as the org-invite flow today.
 */
export async function acceptProjectInvitation(token: string): Promise<AcceptProjectInvitationResult> {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { token },
    include: { project: { select: { name: true } } },
  });
  if (!invitation) return { success: false, error: "This invitation link is invalid." };
  if (invitation.status !== "PENDING") return { success: false, error: "This invitation has already been used." };
  if (invitation.expiresAt < new Date()) return { success: false, error: "This invitation has expired." };

  await prisma.projectInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } });

  await logAudit({
    organizationId: invitation.organizationId,
    actorId: null,
    action: "project.invitation_accepted",
    entityType: "project_invitation",
    entityId: invitation.id,
  });

  return { success: true, projectName: invitation.project.name };
}

export async function getProjectInvitationPreview(token: string) {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { token },
    include: { project: { select: { name: true } } },
  });
  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) return null;
  return { projectName: invitation.project.name, roleLabel: invitation.roleLabel, email: invitation.email };
}
