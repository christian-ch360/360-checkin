/**
 * Single source of truth for the Kiosk Hero's configurable sizes (logo +
 * typography) — the Theme Editor's sliders read the ranges from here, and
 * every consumer (theme resolution, live kiosk, preview) falls back to
 * these defaults for any theme that hasn't set its own value (nullable
 * columns on KioskTheme — see prisma/schema.prisma), the same pattern
 * already used for colors elsewhere in the theme.
 */
export const KIOSK_HERO_SIZE_DEFAULTS = {
  logoSize: 180,
  titleSize: 72,
  subtitleSize: 24,
  dateTimeSize: 16,
  locationSize: 16,
  countdownSize: 30,
} as const;

export const KIOSK_HERO_SIZE_RANGES = {
  logoSize: { min: 80, max: 300 },
  titleSize: { min: 48, max: 140 },
  subtitleSize: { min: 20, max: 72 },
  dateTimeSize: { min: 16, max: 48 },
  locationSize: { min: 16, max: 48 },
  countdownSize: { min: 20, max: 64 },
} as const;

export type KioskHeroSizeKey = keyof typeof KIOSK_HERO_SIZE_DEFAULTS;
