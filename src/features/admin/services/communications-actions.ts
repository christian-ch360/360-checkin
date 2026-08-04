"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { EmailService } from "@/lib/email/email-service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/security/temp-password";
import { listMembers } from "@/features/members/services/members.service";

export type CommunicationsActionResult = { success: true; sent: number } | { success: false; error: string };

async function requireCommsAccess() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    throw new Error("You don't have permission to send communications.");
  }
  return actor;
}

export async function searchMembersForCommunications(query: string) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) return [];

  const { members } = await listMembers(actor.organizationId, { search: query || undefined }, { page: 1, pageSize: 20 });
  return members.map((m) => ({ id: m.id, fullName: m.fullName, email: m.email, memberNumber: m.memberNumber, status: m.status }));
}

const sendSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().min(1, "Message is required"),
  memberIds: z.array(z.string().uuid()).min(1, "Select at least one recipient"),
});

/**
 * Backs both "send announcement" (memberIds = a filtered list) and "send
 * individual email" (memberIds = one id) — same operation at different
 * fan-out, so there's one implementation rather than two near-duplicates.
 */
export async function sendAnnouncementAction(input: z.infer<typeof sendSchema>): Promise<CommunicationsActionResult> {
  let actor;
  try {
    actor = await requireCommsAccess();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const members = await prisma.member.findMany({
    where: { id: { in: parsed.data.memberIds }, organizationId: actor.organizationId },
    select: { id: true, fullName: true, email: true },
  });
  if (members.length === 0) return { success: false, error: "No matching recipients found." };

  await Promise.all(
    members.map((member) =>
      EmailService.sendAnnouncementEmail({
        to: member.email,
        fullName: member.fullName,
        subject: parsed.data.subject,
        body: parsed.data.body,
        organizationId: actor.organizationId,
        memberId: member.id,
        sentBy: actor.id,
      })
    )
  );

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "communications.sent",
    entityType: "email_broadcast",
    entityId: actor.id,
    after: { subject: parsed.data.subject, recipientCount: members.length },
  });

  revalidatePath("/admin/communications");
  return { success: true, sent: members.length };
}

export async function resendWelcomeEmailAction(memberId: string): Promise<CommunicationsActionResult> {
  let actor;
  try {
    actor = await requireCommsAccess();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: actor.organizationId },
    include: { qrAsset: true },
  });
  if (!member) return { success: false, error: "Member not found." };

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { success: false, error: "SUPABASE_SERVICE_ROLE_KEY isn't configured — automatic account setup is unavailable." };
  }

  const tempPassword = generateTempPassword();

  const { error: authError } = member.authUserId
    ? await supabaseAdmin.auth.admin.updateUserById(member.authUserId, { password: tempPassword })
    : await supabaseAdmin.auth.admin
        .createUser({ email: member.email, password: tempPassword, email_confirm: true })
        .then(async (res) => {
          if (res.data.user) {
            await prisma.member.update({ where: { id: member.id }, data: { authUserId: res.data.user.id } });
          }
          return res;
        });

  if (authError) {
    return { success: false, error: `Could not reset login access: ${authError.message}` };
  }

  const qrAsset = member.qrAsset ?? (await prisma.qRAsset.findFirst({ where: { type: "MEMBER", memberId: member.id } }));
  if (!qrAsset) return { success: false, error: "This member has no QR code on file." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const result = await EmailService.sendWelcomeEmail({
    to: member.email,
    fullName: member.fullName,
    memberNumber: member.memberNumber,
    loginUrl: `${appUrl}/login`,
    tempPassword,
    qrCodeUrl: `${appUrl}/api/qr/${qrAsset.token}`,
    organizationId: actor.organizationId,
    memberId: member.id,
    sentBy: actor.id,
  });

  if (!result.sent) return { success: false, error: `Email could not be sent (${result.reason}).` };

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "communications.welcome_resent",
    entityType: "member",
    entityId: member.id,
  });

  revalidatePath("/admin/communications");
  return { success: true, sent: 1 };
}
