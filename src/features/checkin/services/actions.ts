"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { resolveQRToken } from "@/features/qr/services/qr-asset.service";
import { extractQrToken } from "@/features/qr/services/qr-scan-utils";
import { toggleCheckIn, getOpenCheckIn, type CheckInResult } from "@/features/checkin/services/checkin.service";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";

export type ScanCheckInResult = CheckInResult & { memberName?: string };

export async function checkInByToken(token: string): Promise<ScanCheckInResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "checkin.manage")) {
    return { error: "You don't have permission to manage check-ins." };
  }

  const qrAsset = await resolveQRToken(extractQrToken(token));
  if (!qrAsset || qrAsset.type !== "MEMBER" || !qrAsset.member) {
    return { error: "This QR code does not belong to a member badge." };
  }

  const result = await toggleCheckIn(qrAsset.member.id);
  revalidatePath("/check-in");
  revalidatePath("/dashboard");

  return { ...result, memberName: qrAsset.member.fullName };
}

export async function manualCheckIn(memberId: string): Promise<ScanCheckInResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "checkin.manage")) {
    return { error: "You don't have permission to manage check-ins." };
  }

  const result = await toggleCheckIn(memberId, "manual");
  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  revalidatePath("/kiosk/admin");
  return result;
}

export type ManualCheckinSearchResult = {
  id: string;
  fullName: string;
  memberNumber: string;
  profilePhotoUrl: string | null;
  isCheckedIn: boolean;
};

export async function searchMembersForManualCheckin(query: string): Promise<ManualCheckinSearchResult[]> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "checkin.manage")) return [];
  if (query.trim().length === 0) return [];

  const members = await prisma.member.findMany({
    where: {
      organizationId: actor.organizationId,
      status: { not: "SUSPENDED" },
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { memberNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, memberNumber: true, profilePhotoUrl: true },
    take: 8,
  });

  const openCheckIns = await Promise.all(members.map((m) => getOpenCheckIn(m.id)));

  return members.map((m, i) => ({ ...m, isCheckedIn: Boolean(openCheckIns[i]) }));
}
