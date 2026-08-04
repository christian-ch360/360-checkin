"use server";

import { extractQrToken } from "@/features/qr/services/qr-scan-utils";
import { resolveQRToken } from "@/features/qr/services/qr-asset.service";
import { kioskCheckInByToken, type KioskCheckInResult } from "@/features/kiosk/services/kiosk-checkin.service";
import { kioskLocationScan, type KioskLocationRef } from "@/features/kiosk/services/kiosk-location-checkin.service";
import { getKioskOrganizationId } from "@/features/kiosk/config";
import { logAudit } from "@/lib/db/audit-log";
import { recordKioskInteraction } from "@/features/kiosk/services/kiosk-analytics.service";

/**
 * Single entry point for anything scanned at the kiosk. Resolves the token
 * once, then dispatches on the asset type — the "future ready" extension
 * point: a SPACE or EVENT badge scanned here later is an additive case,
 * not a rewrite of the kiosk's scan handling.
 *
 * `location` is the kiosk's resolved ?location= target (null when no param
 * was given, preserving today's static-entrance behavior). ENTRANCE type
 * (or no location) uses the existing facility CheckIn flow; every other
 * type uses the new ScanEvent-backed enter/exit toggle.
 */
export async function resolveAndActOnKioskScan(
  rawScan: string,
  location: KioskLocationRef | null
): Promise<KioskCheckInResult> {
  const token = extractQrToken(rawScan);
  const qrAsset = await resolveQRToken(token);

  const organizationId = getKioskOrganizationId();

  if (!qrAsset) return { outcome: "not_found" };

  await logAudit({
    organizationId,
    action: "qr.scanned",
    entityType: "qr_asset",
    entityId: qrAsset.id,
    after: { assetType: qrAsset.type, memberId: qrAsset.member?.id ?? null },
  });
  await recordKioskInteraction(organizationId, "QR_SCAN", { metadata: { assetType: qrAsset.type } });

  const result: KioskCheckInResult =
    qrAsset.type === "MEMBER"
      ? location && location.type !== "ENTRANCE"
        ? await kioskLocationScan(location, rawScan)
        : await kioskCheckInByToken(rawScan)
      : { outcome: "wrong_type" };

  if (result.outcome === "checked_in") {
    await recordKioskInteraction(organizationId, "CHECK_IN");
  }
  return result;
}
