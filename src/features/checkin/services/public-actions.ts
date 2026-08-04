"use server";

import { revalidatePath } from "next/cache";
import { resolveQRToken } from "@/features/qr/services/qr-asset.service";
import { toggleCheckIn, type CheckInResult } from "@/features/checkin/services/checkin.service";

/**
 * Public, unauthenticated self-checkin used by the /scan/[token] kiosk page.
 * Anyone holding the physical badge (i.e. who can present its QR token) may
 * toggle their own check-in state — equivalent to a badge reader at a door.
 */
export async function selfCheckInByToken(token: string): Promise<CheckInResult> {
  const qrAsset = await resolveQRToken(token);
  if (!qrAsset || qrAsset.type !== "MEMBER" || !qrAsset.member) {
    return { error: "This QR code does not belong to a member badge." };
  }

  const result = await toggleCheckIn(qrAsset.member.id);
  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  return result;
}
