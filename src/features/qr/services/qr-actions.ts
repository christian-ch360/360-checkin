"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/db/activity-log";
import { generateQRToken } from "@/features/qr/services/qr-token";

export type QRActionResult = { success: true } | { success: false; error: string };

/**
 * Mints a new signed token for a member's permanent QR asset, permanently
 * invalidating the previous one. Never called automatically — every other
 * code path (member creation, profile view) only ever get-or-creates via
 * ensureQRAsset, which never rotates an existing token. Self-service is
 * always allowed (it's your own code, on your own account); regenerating
 * someone ELSE's QR still requires members.manage.
 */
export async function regenerateMemberQR(memberId: string): Promise<QRActionResult> {
  const actor = await requireCurrentMember();
  if (memberId !== actor.id && !hasPermission(actor.systemRole, "members.manage")) {
    return { success: false, error: "You don't have permission to regenerate QR codes." };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: actor.organizationId },
  });
  if (!member) return { success: false, error: "Member not found." };

  const newToken = generateQRToken("MEMBER");

  await prisma.qRAsset.upsert({
    where: { memberId },
    update: { token: newToken },
    create: { type: "MEMBER", memberId, token: newToken },
  });

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "member.qr_regenerated",
    entityType: "member",
    entityId: memberId,
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/settings/qr-code");
  revalidatePath("/my-qr");
  return { success: true };
}
