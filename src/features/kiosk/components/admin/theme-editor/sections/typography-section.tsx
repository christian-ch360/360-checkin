import { KIOSK_HERO_SIZE_RANGES } from "@/features/kiosk/config/kiosk-hero-sizing.config";
import { SizeSliderField } from "../size-slider-field";
import type { FormState, UpdateFormField } from "../types";

/** The Kiosk Hero's text-size controls — every value is theme-driven (see
 * KioskTheme.hero*Size in the schema) rather than hardcoded in KioskHero,
 * same architecture as the color/spacing/background-effect controls
 * elsewhere in the editor. */
export function TypographySection({ form, update }: { form: FormState; update: UpdateFormField }) {
  return (
    <div className="space-y-6">
      <SizeSliderField
        id="theme-hero-title-size"
        label="Event Title Size"
        value={form.heroTitleSize}
        min={KIOSK_HERO_SIZE_RANGES.titleSize.min}
        max={KIOSK_HERO_SIZE_RANGES.titleSize.max}
        onChange={(v) => update("heroTitleSize", v)}
      />
      <SizeSliderField
        id="theme-hero-subtitle-size"
        label="Event Subtitle Size"
        value={form.heroSubtitleSize}
        min={KIOSK_HERO_SIZE_RANGES.subtitleSize.min}
        max={KIOSK_HERO_SIZE_RANGES.subtitleSize.max}
        onChange={(v) => update("heroSubtitleSize", v)}
      />
      <SizeSliderField
        id="theme-hero-datetime-size"
        label="Date/Time Size"
        value={form.heroDateTimeSize}
        min={KIOSK_HERO_SIZE_RANGES.dateTimeSize.min}
        max={KIOSK_HERO_SIZE_RANGES.dateTimeSize.max}
        onChange={(v) => update("heroDateTimeSize", v)}
      />
      <SizeSliderField
        id="theme-hero-location-size"
        label="Location Size"
        value={form.heroLocationSize}
        min={KIOSK_HERO_SIZE_RANGES.locationSize.min}
        max={KIOSK_HERO_SIZE_RANGES.locationSize.max}
        onChange={(v) => update("heroLocationSize", v)}
      />
      <SizeSliderField
        id="theme-hero-countdown-size"
        label="Countdown Size"
        value={form.heroCountdownSize}
        min={KIOSK_HERO_SIZE_RANGES.countdownSize.min}
        max={KIOSK_HERO_SIZE_RANGES.countdownSize.max}
        onChange={(v) => update("heroCountdownSize", v)}
      />
    </div>
  );
}
