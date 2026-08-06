import "server-only";

/**
 * A physical kiosk device belongs to exactly one organization/location.
 * There's no authenticated actor to derive this from (kiosk writes are
 * unauthenticated), so it must come from device config, and must fail
 * loudly rather than guess if misconfigured.
 */
export function getKioskOrganizationId(): string {
  const id = process.env.KIOSK_ORGANIZATION_ID;
  if (!id) {
    throw new Error(
      "KIOSK_ORGANIZATION_ID is not set. Configure it in the environment for this kiosk device before use."
    );
  }
  return id;
}

export const KIOSK_NAME = process.env.KIOSK_NAME || "CreatorHub360";
export const KIOSK_LOCATION = process.env.KIOSK_LOCATION || null;
