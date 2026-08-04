"use server";

import type { KioskInteractionType } from "@prisma/client";
import { getKioskOrganizationId } from "@/features/kiosk/config";
import { recordKioskInteraction } from "@/features/kiosk/services/kiosk-analytics.service";

/**
 * Public, unauthenticated — same trust model as every other kiosk write
 * (the kiosk itself has no signed-in actor). Callable directly from kiosk
 * client components to record a THEME_VIEW/CTA_CLICK/REGISTRATION/
 * EVENT_SIGNUP the instant it happens, without round-tripping through an
 * authenticated admin surface.
 */
export async function recordKioskInteractionAction(
  type: KioskInteractionType,
  options: { themeKey?: string | null; announcementId?: string | null } = {}
): Promise<void> {
  await recordKioskInteraction(getKioskOrganizationId(), type, options);
}
