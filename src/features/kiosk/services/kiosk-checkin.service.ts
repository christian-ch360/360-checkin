import { format } from "date-fns";
import { resolveQRToken } from "@/features/qr/services/qr-asset.service";
import { extractQrToken } from "@/features/qr/services/qr-scan-utils";
import { toggleCheckIn } from "@/features/checkin/services/checkin.service";
import { getKioskOrganizationId } from "@/features/kiosk/config";
import { getLocationBySlug, logScanEvent } from "@/features/locations/services/locations.service";
import { formatDuration } from "@/lib/utils/format";

export type KioskCheckInResult =
  | { outcome: "not_found" }
  | { outcome: "wrong_type" }
  | { outcome: "wrong_org" }
  | { outcome: "expired" }
  | { outcome: "pending_approval" }
  | { outcome: "rejected" }
  | { outcome: "checked_in"; memberName: string; role: string; profilePhotoUrl: string | null; time: string }
  | { outcome: "checked_out"; memberName: string; role: string; profilePhotoUrl: string | null; duration: string };

/**
 * Single-scan kiosk workflow: no separate check-in/check-out choice — a scan
 * from a member with no open session checks them in, a scan from a member
 * who's already checked in checks them out. Delegates entirely to
 * toggleCheckIn (the same function the dashboard/badge-reader flow uses) so
 * the "never create duplicate open sessions" guarantee lives in one place.
 * Public — no requireCurrentMember — same trust model as /scan/[token].
 */
export async function kioskCheckInByToken(rawScan: string): Promise<KioskCheckInResult> {
  const token = extractQrToken(rawScan);
  const qrAsset = await resolveQRToken(token);

  if (!qrAsset) return { outcome: "not_found" };
  if (qrAsset.type !== "MEMBER" || !qrAsset.member) return { outcome: "wrong_type" };

  const member = qrAsset.member;
  if (member.organizationId !== getKioskOrganizationId()) return { outcome: "wrong_org" };
  if (member.status === "PENDING") return { outcome: "pending_approval" };
  if (member.status === "REJECTED") return { outcome: "rejected" };
  if (member.status === "SUSPENDED" || member.status === "INACTIVE") return { outcome: "expired" };

  const result = await toggleCheckIn(member.id, "qr");
  if ("error" in result) return { outcome: "expired" };

  // Best-effort audit dual-write alongside the CheckIn table (source of
  // truth, unchanged above) — a missing/misconfigured Entrance location
  // must never block the actual check-in.
  try {
    const entrance = await getLocationBySlug(member.organizationId, "entrance");
    if (entrance) {
      await logScanEvent({
        memberId: member.id,
        location: { id: entrance.id, name: entrance.name, type: entrance.type },
        action: result.action === "checked_out" ? "FACILITY_CHECK_OUT" : "FACILITY_CHECK_IN",
      });
    }
  } catch (err) {
    console.warn("Kiosk entrance ScanEvent dual-write failed:", err);
  }

  if (result.action === "checked_out") {
    return {
      outcome: "checked_out",
      memberName: member.fullName,
      role: member.role,
      profilePhotoUrl: member.profilePhotoUrl,
      duration: formatDuration(result.durationMinutes),
    };
  }

  return {
    outcome: "checked_in",
    memberName: member.fullName,
    role: member.role,
    profilePhotoUrl: member.profilePhotoUrl,
    time: format(new Date(), "h:mm a"),
  };
}
