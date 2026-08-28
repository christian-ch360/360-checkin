"use client";

import type { KioskDecorativeElement } from "@prisma/client";
import type { ResolvedKioskTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";
import { KioskDecorativeLayer } from "@/features/kiosk/components/kiosk-decorative-layer";

/**
 * The active theme's background + decorative effects, rendered once for the
 * *entire* kiosk viewport rather than confined inside the hero card — this
 * is what makes an event theme feel like an immersive takeover instead of a
 * themed card floating on a plain white page. Sits behind every other layer
 * KioskApp renders (OfflineBanner, hero content, check-in/register cards,
 * announcements) via negative z-index; KioskChrome's own static white
 * KioskBackground stays as the always-present fallback beneath this, for
 * the untethered default/no-theme state.
 *
 * Rendered from KioskApp (not KioskChrome) because KioskChrome is the
 * route's layout.tsx and never sees the resolved theme — only the page
 * (and KioskApp, which both the live route and the Theme Editor preview
 * already share) does.
 */
export function KioskThemeBackground({ theme }: { theme?: ResolvedKioskTheme | null }) {
  const isThemed = Boolean(theme && !theme.isDefault);
  if (!isThemed || !theme) return null;

  const hasImageBackground = Boolean(theme.backgroundImageUrl || theme.backgroundVideoUrl);
  const hasColorBackground = !hasImageBackground && Boolean(theme.primaryColor);
  const decorativeElements = (theme.decorativeElements ?? []) as KioskDecorativeElement[];
  const themeColors = Array.isArray(theme.themeColors) ? (theme.themeColors as { name: string; hex: string }[]) : null;

  return (
    <>
      {hasImageBackground && (
        <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden">
          {theme.backgroundVideoUrl ? (
            <video
              src={theme.backgroundVideoUrl}
              poster={theme.backgroundImageUrl ?? undefined}
              className="size-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- kiosk background is admin-supplied, arbitrary remote URLs
            <img src={theme.backgroundImageUrl!} alt="" className="size-full object-cover" />
          )}
          {theme.backgroundOverlay && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
          )}
        </div>
      )}
      {hasColorBackground && (
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(160deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor})`,
          }}
        />
      )}
      {(hasImageBackground || hasColorBackground) && decorativeElements.length > 0 && (
        <div className="fixed inset-0 -z-10">
          <KioskDecorativeLayer elements={decorativeElements} themeColors={themeColors} />
        </div>
      )}
    </>
  );
}
