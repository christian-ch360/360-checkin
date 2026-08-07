import Image from "next/image";
import { resolveEventLogoSrc } from "@/features/events/lib/event-logo";

/**
 * The single reusable event logo — every screen that shows an event's brand
 * mark (cards, detail hero, kiosk hero/banner, theme preview) renders through
 * this component instead of re-implementing the fallback chain.
 */
export function EventLogo({
  logoUrl,
  organizationLogoUrl,
  alt,
  size = 48,
  className = "",
}: {
  logoUrl?: string | null;
  organizationLogoUrl?: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={resolveEventLogoSrc(logoUrl, organizationLogoUrl)}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-2xl object-contain ${className}`}
    />
  );
}
