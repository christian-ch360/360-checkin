import { KioskApp } from "@/features/kiosk/components/kiosk-app";
import { KIOSK_NAME, KIOSK_LOCATION, getKioskOrganizationId } from "@/features/kiosk/config";
import { getLocationBySlug } from "@/features/locations/services/locations.service";
import { ensureDefaultTheme, ensureDefaultThemePresets } from "@/features/kiosk/services/kiosk-theme.service";
import { resolveActiveTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";
import { getVisibleAnnouncements } from "@/features/kiosk/services/kiosk-announcements.service";
import { getHomepageSections } from "@/features/kiosk/services/kiosk-sections.service";
import { getKioskFeaturedEvent } from "@/features/kiosk/services/kiosk-featured-event.service";

export const dynamic = "force-dynamic";

export default async function KioskPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const { location: locationSlug } = await searchParams;
  const organizationId = getKioskOrganizationId();

  await ensureDefaultTheme(organizationId);
  await ensureDefaultThemePresets(organizationId);

  const [location, theme, announcements, sections, featuredEvent] = await Promise.all([
    locationSlug ? getLocationBySlug(organizationId, locationSlug) : Promise.resolve(null),
    resolveActiveTheme(organizationId),
    getVisibleAnnouncements(organizationId),
    getHomepageSections(organizationId),
    getKioskFeaturedEvent(organizationId),
  ]);

  return (
    <KioskApp
      kioskName={KIOSK_NAME}
      kioskLocation={location ? location.name : KIOSK_LOCATION}
      location={location ? { id: location.id, name: location.name, type: location.type } : null}
      theme={theme}
      announcements={announcements}
      enabledSectionKeys={sections.filter((s) => s.enabled).map((s) => s.key)}
      featuredEvent={featuredEvent}
    />
  );
}
