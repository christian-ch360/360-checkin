import type { StaticImageData } from "next/image";
import ch360Logo from "../../../../images/Ch360 Logo 3.PNG";

/** The single source of truth for the default event brand mark. */
export const CREATORHUB360_DEFAULT_LOGO: StaticImageData = ch360Logo;

/**
 * Event logo fallback chain, used everywhere an event's logo is rendered
 * (event cards, event detail, kiosk hero/banner, theme preview): the
 * event's own uploaded logo, else the organization's logo, else the
 * CreatorHub360 default. Keep this the only place that chain is expressed.
 */
export function resolveEventLogoSrc(
  logoUrl?: string | null,
  organizationLogoUrl?: string | null
): string | StaticImageData {
  return logoUrl || organizationLogoUrl || CREATORHUB360_DEFAULT_LOGO;
}
