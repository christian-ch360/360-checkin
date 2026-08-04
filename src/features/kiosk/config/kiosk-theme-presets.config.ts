import type { KioskDecorativeElement } from "@prisma/client";
import type { KioskThemeInput } from "@/features/kiosk/services/kiosk-theme.service";

/**
 * The three theme presets from the Kiosk Theme System spec, seeded once per
 * organization by ensureDefaultThemePresets (see kiosk-theme.service.ts) so
 * every environment ships with real, working examples of the theming system
 * rather than an empty list — same self-healing convention as
 * ensureDefaultTheme. Fully editable afterward via the normal Theme Editor;
 * this config is only the seed content, not a source of truth read at
 * runtime.
 */
export type KioskThemePreset = Omit<KioskThemeInput, "startDate" | "endDate"> & {
  /** Resolved against a reference "now" at seed time — see resolvePresetDates below. */
  schedule:
    | { kind: "one-time"; month: number; day: number; startTime: string; endTime: string }
    | { kind: "weekly"; dayOfWeek: number; startTime: string; endTime: string };
};

const CHRISTMAS_COLORS = [
  { name: "Snow White", hex: "#FFFFFF" },
  { name: "Forest Green", hex: "#1B4D3E" },
  { name: "Christmas Red", hex: "#B3122A" },
  { name: "Gold", hex: "#D4AF37" },
];

const HALLOWEEN_COLORS = [
  { name: "Black", hex: "#0A0A0A" },
  { name: "Orange", hex: "#FF7518" },
  { name: "Purple", hex: "#6B21A8" },
  { name: "Dark Gray", hex: "#2E2E33" },
];

const WHISKEY_COLORS = [
  { name: "Matte Black", hex: "#161412" },
  { name: "Bourbon Amber", hex: "#B5651D" },
  { name: "Walnut Brown", hex: "#5C4033" },
  { name: "Copper", hex: "#B87333" },
];

const CHRISTMAS_DECORATIONS: KioskDecorativeElement[] = [
  "SNOWFALL",
  "CHRISTMAS_LIGHTS",
  "DECORATED_TREES",
  "WRAPPED_GIFTS",
  "GOLD_GLOW",
];

const HALLOWEEN_DECORATIONS: KioskDecorativeElement[] = [
  "PUMPKINS",
  "SPIDER_WEBS",
  "PURPLE_LIGHTING",
  "FLOATING_GHOSTS",
  "ANIMATED_BATS",
];

const WHISKEY_DECORATIONS: KioskDecorativeElement[] = [
  "LUXURY_VIGNETTE",
  "LEATHER_TEXTURE",
  "WHISKEY_GLOW",
  "WARM_LIGHTING",
  "COPPER_ACCENTS",
];

export const KIOSK_THEME_PRESETS: KioskThemePreset[] = [
  {
    name: "Christmas",
    headline: "🎄 Merry Christmas from CreatorHub360",
    subheadline: "Celebrate the holidays with creators, founders, brands, and our amazing community.",
    location: "CreatorHub360 Lounge",
    primaryColor: "#1B4D3E",
    secondaryColor: "#B3122A",
    accentColor: "#D4AF37",
    buttonColor: "#B3122A",
    buttonTextColor: "#FFFFFF",
    buttonStyle: "SOLID",
    textColor: "#FFFFFF",
    animationStyle: "SLIDE",
    themeColors: CHRISTMAS_COLORS,
    decorativeElements: CHRISTMAS_DECORATIONS,
    ctaLabel: "Join Today's Holiday Mixer",
    ctaLink: "/apply",
    featuredEventTitle: "Holiday Creator Mixer",
    featuredEventTags: ["Free for Members"],
    showCountdown: true,
    schedule: { kind: "one-time", month: 12, day: 18, startTime: "18:00", endTime: "21:00" },
  },
  {
    name: "Halloween",
    headline: "🎃 Halloween at CreatorHub360",
    subheadline: "Dress up. Network. Create.",
    primaryColor: "#0A0A0A",
    secondaryColor: "#FF7518",
    accentColor: "#6B21A8",
    buttonColor: "#FF7518",
    buttonTextColor: "#0A0A0A",
    buttonStyle: "GRADIENT",
    textColor: "#FFFFFF",
    animationStyle: "ZOOM",
    themeColors: HALLOWEEN_COLORS,
    decorativeElements: HALLOWEEN_DECORATIONS,
    ctaLabel: "Register for Halloween Mixer",
    ctaLink: "/apply",
    featuredEventTitle: "Halloween Creator Party",
    featuredEventTags: ["Costume Contest", "Live DJ", "Drinks"],
    showCountdown: true,
    schedule: { kind: "one-time", month: 10, day: 31, startTime: "20:00", endTime: "23:59" },
  },
  {
    name: "Whiskey Wednesday",
    headline: "🥃 Whiskey Wednesday",
    subheadline: "Relax. Connect. Build Relationships.",
    location: "Executive Lounge",
    primaryColor: "#161412",
    secondaryColor: "#B5651D",
    accentColor: "#B87333",
    buttonColor: "#B5651D",
    buttonTextColor: "#FFFFFF",
    buttonStyle: "OUTLINE",
    textColor: "#FFFFFF",
    animationStyle: "FADE",
    themeColors: WHISKEY_COLORS,
    decorativeElements: WHISKEY_DECORATIONS,
    ctaLabel: "Reserve Your Spot",
    ctaLink: "/apply",
    featuredEventTitle: "Whiskey Wednesday Networking",
    featuredEventTags: ["Members Only", "Limited Capacity"],
    showCountdown: false,
    schedule: { kind: "weekly", dayOfWeek: 3, startTime: "18:30", endTime: "21:00" },
  },
];

/** Turns a preset's declarative schedule into the concrete startDate/endDate/recurrence
 * fields KioskThemeInput needs, anchored to `now`. One-time presets land on the next
 * upcoming occurrence of that month/day; weekly presets get an open-ended window (the
 * recurrence fields alone gate which days are actually live). */
export function resolvePresetSchedule(
  schedule: KioskThemePreset["schedule"],
  now: Date = new Date()
): Pick<
  KioskThemeInput,
  "startDate" | "endDate" | "startTime" | "endTime" | "recurrence" | "recurrenceDaysOfWeek"
> {
  if (schedule.kind === "weekly") {
    const daysUntil = (schedule.dayOfWeek - now.getDay() + 7) % 7;
    const nextOccurrence = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil);
    return {
      startDate: nextOccurrence,
      endDate: new Date(2099, 11, 31),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      recurrence: "WEEKLY",
      recurrenceDaysOfWeek: [schedule.dayOfWeek],
    };
  }

  let candidate = new Date(now.getFullYear(), schedule.month - 1, schedule.day);
  if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    candidate = new Date(now.getFullYear() + 1, schedule.month - 1, schedule.day);
  }
  return {
    startDate: candidate,
    endDate: candidate,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    recurrence: "NONE",
    recurrenceDaysOfWeek: [],
  };
}
