import { format } from "date-fns";
import type { LocationType } from "@prisma/client";
import { resolveQRToken } from "@/features/qr/services/qr-asset.service";
import { extractQrToken } from "@/features/qr/services/qr-scan-utils";
import { getOpenLocationScan, logScanEvent } from "@/features/locations/services/locations.service";
import { getKioskOrganizationId } from "@/features/kiosk/config";
import { formatDuration } from "@/lib/utils/format";

export type KioskLocationScanResult =
  | { outcome: "not_found" }
  | { outcome: "wrong_type" }
  | { outcome: "wrong_org" }
  | { outcome: "expired" }
  | { outcome: "pending_approval" }
  | { outcome: "rejected" }
  | { outcome: "checked_in"; memberName: string; role: string; profilePhotoUrl: string | null; time: string }
  | { outcome: "checked_out"; memberName: string; role: string; profilePhotoUrl: string | null; duration: string };

/**
 * Single-scan toggle for non-entrance locations (booths, podcast room,
 * recording studio, beauty chairs, rooftop, etc.) — same gating and
 * toggle-by-latest-state shape as kioskCheckInByToken, but reads/writes
 * ScanEvent instead of CheckIn since these locations have no facility
 * attendance record of their own.
 */
export type KioskLocationRef = { id: string; name: string; type: LocationType };

export async function kioskLocationScan(location: KioskLocationRef, rawScan: string): Promise<KioskLocationScanResult> {
  const token = extractQrToken(rawScan);
  const qrAsset = await resolveQRToken(token);

  if (!qrAsset) return { outcome: "not_found" };
  if (qrAsset.type !== "MEMBER" || !qrAsset.member) return { outcome: "wrong_type" };

  const member = qrAsset.member;
  if (member.organizationId !== getKioskOrganizationId()) return { outcome: "wrong_org" };
  if (member.status === "PENDING") return { outcome: "pending_approval" };
  if (member.status === "REJECTED") return { outcome: "rejected" };
  if (member.status === "SUSPENDED" || member.status === "INACTIVE") return { outcome: "expired" };

  const locationRef = { id: location.id, name: location.name, type: location.type };
  const open = await getOpenLocationScan(member.id, location.id);

  if (open) {
    const checkOutTime = new Date();
    const durationMinutes = Math.max(0, Math.round((checkOutTime.getTime() - open.timestamp.getTime()) / 60000));
    await logScanEvent({ memberId: member.id, location: locationRef, action: "SPACE_EXIT" });

    return {
      outcome: "checked_out",
      memberName: member.fullName,
      role: member.role,
      profilePhotoUrl: member.profilePhotoUrl,
      duration: formatDuration(durationMinutes),
    };
  }

  await logScanEvent({ memberId: member.id, location: locationRef, action: "SPACE_ENTER" });

  return {
    outcome: "checked_in",
    memberName: member.fullName,
    role: member.role,
    profilePhotoUrl: member.profilePhotoUrl,
    time: format(new Date(), "h:mm a"),
  };
}
