"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import Papa from "papaparse";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import {
  SYSTEM_ROLE_LABELS,
  systemRoleValues,
  canManageMemberRole,
  canInviteWithRole,
  SYSTEM_ROLE_RANK,
} from "@/lib/permissions/member-rules";
import { isLastSuperAdmin } from "@/lib/db/member-role-guards";
import { logAudit } from "@/lib/db/audit-log";
import { createNotification } from "@/lib/notifications";
import type { SystemRole } from "@prisma/client";
import { generateInvitationToken, defaultInvitationExpiry } from "@/features/admin/services/invitations.service";
import { generateMemberNumber, isUniqueConstraintError } from "@/features/members/services/member-number";
import { findEmailConflict, GENERIC_EMAIL_TAKEN_MESSAGE } from "@/features/members/services/email-lookup.service";
import { memberRoleValues } from "@/features/members/schemas/member.schema";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { EmailService } from "@/lib/email/email-service";

export type AdminActionResult = { success: true } | { success: false; error: string };

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(systemRoleValues),
});

async function sendInvitationEmail(invitation: {
  email: string;
  role: SystemRole;
  token: string;
  expiresAt: Date;
  organizationId: string;
  invitedById: string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/signup?invite=${invitation.token}`;
  return EmailService.sendOrgInvitationEmail({
    to: invitation.email,
    roleLabel: SYSTEM_ROLE_LABELS[invitation.role],
    inviteUrl,
    expiresAt: invitation.expiresAt,
    organizationId: invitation.organizationId,
    sentBy: invitation.invitedById,
  });
}

export async function inviteMember(input: z.infer<typeof inviteSchema>): Promise<AdminActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    return { success: false, error: "You don't have permission to invite members." };
  }

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const invitePermission = canInviteWithRole(actor.systemRole, parsed.data.role);
  if (!invitePermission.allowed) {
    return { success: false, error: invitePermission.reason! };
  }

  // Catches the problem at invite time rather than letting the invitee fill
  // out the whole signup form only to be blocked by signupAction's own
  // check — same shared lookup, same generic message.
  const emailConflict = await findEmailConflict(actor.organizationId, parsed.data.email);
  if (emailConflict) {
    return { success: false, error: GENERIC_EMAIL_TAKEN_MESSAGE };
  }

  console.log("[invite] creating invitation", { email: parsed.data.email, role: parsed.data.role, invitedBy: actor.id });

  const invitation = await prisma.invitation.create({
    data: {
      organizationId: actor.organizationId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedById: actor.id,
      token: generateInvitationToken(),
      expiresAt: defaultInvitationExpiry(),
    },
  });

  const emailResult = await sendInvitationEmail(invitation);

  revalidatePath("/admin");

  if (!emailResult.sent) {
    // The invitation row is kept (not rolled back) — the admin can retry
    // via "Resend" rather than losing the token and having to re-enter the
    // email/role. Never fail silently: surface exactly what went wrong.
    const reason =
      emailResult.reason === "not_configured"
        ? "no email provider is configured (RESEND_API_KEY is unset)"
        : emailResult.reason;
    return {
      success: false,
      error: `Invitation was created, but the email could not be sent (${reason}). Use "Resend" to try again once this is fixed.`,
    };
  }

  return { success: true };
}

export async function resendInvitation(invitationId: string): Promise<AdminActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    return { success: false, error: "You don't have permission to manage invitations." };
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId, organizationId: actor.organizationId },
  });
  if (!invitation) return { success: false, error: "Invitation not found." };
  if (invitation.status !== "PENDING") {
    return { success: false, error: "Only pending invitations can be resent." };
  }

  // Resending refreshes the expiry too, since the original 7-day window may
  // have partially or fully elapsed since the first (failed or ignored) send.
  const refreshed = await prisma.invitation.update({
    where: { id: invitationId },
    data: { expiresAt: defaultInvitationExpiry() },
  });

  console.log("[invite] resending invitation", { email: refreshed.email, invitationId });

  const emailResult = await sendInvitationEmail(refreshed);
  if (!emailResult.sent) {
    const reason =
      emailResult.reason === "not_configured"
        ? "no email provider is configured (RESEND_API_KEY is unset)"
        : emailResult.reason;
    return { success: false, error: `Resend failed: ${reason}` };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function revokeInvitation(invitationId: string): Promise<AdminActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    return { success: false, error: "You don't have permission to manage invitations." };
  }

  await prisma.invitation.update({
    where: { id: invitationId, organizationId: actor.organizationId },
    data: { status: "REVOKED" },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateMemberSystemRole(memberId: string, role: SystemRole): Promise<AdminActionResult> {
  const actor = await requireCurrentMember();

  const target = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!target) return { success: false, error: "Member not found." };

  const rolePermission = canManageMemberRole(actor, target);
  if (!rolePermission.allowed) {
    return { success: false, error: rolePermission.reason! };
  }

  if (target.systemRole === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    if (await isLastSuperAdmin(actor.organizationId, memberId)) {
      return { success: false, error: "CreatorHub360 must always have at least one Super Admin." };
    }
  }

  const isPromotion = SYSTEM_ROLE_RANK[role] > SYSTEM_ROLE_RANK[target.systemRole];

  await prisma.member.update({
    where: { id: memberId, organizationId: actor.organizationId },
    data: { systemRole: role },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: isPromotion ? "member.role.promoted" : "member.role.demoted",
    entityType: "member",
    entityId: memberId,
    before: { systemRole: target.systemRole },
    after: { systemRole: role },
  });

  if (isPromotion && role === "ADMIN") {
    await createNotification(memberId, {
      type: "ADMIN_ACCESS_GRANTED",
      title: "Administrator Access Granted",
      body: "You have been promoted to an Administrator.",
    });
  } else if (isPromotion && role === "SUPER_ADMIN") {
    await createNotification(memberId, {
      type: "SUPER_ADMIN_ACCESS_GRANTED",
      title: "Super Admin Access Granted",
      body: "You have been promoted to a Super Administrator.",
    });
  }

  revalidatePath("/admin");
  revalidatePath(`/members/${memberId}`);
  return { success: true };
}

export type BulkImportResult = { success: true; created: number; skipped: number } | { success: false; error: string };

const importRowSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(memberRoleValues).default("CREATOR"),
  phone: z.string().optional(),
});

export async function bulkImportMembers(csvText: string): Promise<BulkImportResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    return { success: false, error: "You don't have permission to import members." };
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    return { success: false, error: `CSV parse error: ${parsed.errors[0].message}` };
  }

  let created = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const rowParsed = importRowSchema.safeParse({
      fullName: row.fullName ?? row["Full Name"] ?? row.name,
      email: row.email ?? row.Email,
      role: (row.role ?? row.Role ?? "CREATOR").toUpperCase(),
      phone: row.phone ?? row.Phone,
    });

    if (!rowParsed.success) {
      skipped++;
      continue;
    }

    const memberNumber = await generateMemberNumber();
    try {
      const member = await prisma.member.create({
        data: {
          organizationId: actor.organizationId,
          memberNumber,
          fullName: rowParsed.data.fullName,
          email: rowParsed.data.email,
          phone: rowParsed.data.phone || null,
          role: rowParsed.data.role,
        },
      });
      await ensureQRAsset({ type: "MEMBER", memberId: member.id });
      created++;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        skipped++;
        continue;
      }
      throw error;
    }
  }

  revalidatePath("/members");
  revalidatePath("/admin");
  return { success: true, created, skipped };
}
