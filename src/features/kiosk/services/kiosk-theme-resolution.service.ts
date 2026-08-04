import "server-only";

import { prisma } from "@/lib/db/prisma";
import { isThemeScheduledNow, type ThemeScheduleFields } from "@/features/kiosk/config/kiosk-schedule";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";

/**
 * "Only one theme is active at a time" — this module is the single place
 * that decision gets made, at read time, from whatever themes are currently
 * PUBLISHED. Nothing stores "is this theme live right now" as a boolean;
 * that would drift the instant the clock crosses a schedule boundary with
 * nobody watching. Every kiosk render and every Admin dashboard "Live"
 * badge calls back into this same resolver. The scheduling predicate itself
 * lives in config/kiosk-schedule.ts (no "server-only" tag) so the Theme
 * Editor's "Preview as Live" simulation can reuse the exact same logic
 * client-side.
 */

export { isThemeScheduledNow, type ThemeScheduleFields };

export type ResolvedKioskTheme = {
  id: string;
  themeKey: string;
  version: number;
  name: string;
  headline: string;
  subheadline: string | null;
  location: string | null;
  backgroundImageUrl: string | null;
  backgroundVideoUrl: string | null;
  logoOverrideUrl: string | null;
  logoVariant: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  buttonColor: string | null;
  buttonTextColor: string | null;
  buttonStyle: string;
  textColor: string | null;
  animationStyle: string;
  themeColors: unknown;
  decorativeElements: string[];
  ctaLabel: string | null;
  ctaLink: string | null;
  startDate: Date;
  endDate: Date;
  startTime: string | null;
  endTime: string | null;
  showCountdown: boolean;
  sponsors: unknown;
  isDefault: boolean;
  showQrRegistration: boolean;
  qrToken: string | null;
  featuredEventTitle: string | null;
  featuredEventTags: string[];
  promoBannerText: string | null;
  promoBannerLink: string | null;
};

type KioskThemeRow = Awaited<ReturnType<typeof fetchPublishedThemes>>[number];

async function fetchPublishedThemes(organizationId: string) {
  return prisma.kioskTheme.findMany({
    where: { organizationId, status: "PUBLISHED" },
    orderBy: { version: "desc" },
    include: { event: { select: { title: true, description: true, location: true, imageUrl: true, startTime: true, endTime: true } } },
  });
}

/** For each themeKey, keep only the highest-version PUBLISHED row (rows already sorted desc by version). */
function latestPerThemeKey(rows: KioskThemeRow[]): KioskThemeRow[] {
  const byKey = new Map<string, KioskThemeRow>();
  for (const row of rows) {
    if (!byKey.has(row.themeKey)) byKey.set(row.themeKey, row);
  }
  return [...byKey.values()];
}

function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * "Use Event as Kiosk Theme ... No duplicate entry required" — when a theme
 * is event-linked, its schedule and display content are read live from the
 * Event (not the theme's own possibly-stale startDate/startTime/etc.), so
 * editing the Event's time in the Events module keeps the kiosk in sync
 * automatically instead of needing a second edit here.
 */
function resolveScheduleAndContent(
  row: KioskThemeRow
): { schedule: ThemeScheduleFields; content: Omit<ResolvedKioskTheme, "id" | "themeKey" | "version" | "isDefault" | "qrToken"> } {
  const event = row.event;
  const schedule: ThemeScheduleFields = event
    ? {
        startDate: event.startTime,
        endDate: event.endTime,
        startTime: toHHmm(event.startTime),
        endTime: toHHmm(event.endTime),
        recurrence: "NONE",
        recurrenceDaysOfWeek: [],
        recurrenceNthWeek: null,
        recurrenceWeekday: null,
      }
    : {
        startDate: row.startDate,
        endDate: row.endDate,
        startTime: row.startTime,
        endTime: row.endTime,
        recurrence: row.recurrence,
        recurrenceDaysOfWeek: row.recurrenceDaysOfWeek,
        recurrenceNthWeek: row.recurrenceNthWeek,
        recurrenceWeekday: row.recurrenceWeekday,
      };

  const content = {
    name: row.name,
    headline: event?.title ?? row.headline,
    subheadline: row.subheadline ?? event?.description ?? null,
    location: event?.location ?? row.location,
    backgroundImageUrl: row.backgroundImageUrl ?? event?.imageUrl ?? null,
    backgroundVideoUrl: row.backgroundVideoUrl,
    logoOverrideUrl: row.logoOverrideUrl,
    logoVariant: row.logoVariant,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    accentColor: row.accentColor,
    buttonColor: row.buttonColor,
    buttonTextColor: row.buttonTextColor,
    buttonStyle: row.buttonStyle,
    textColor: row.textColor,
    animationStyle: row.animationStyle,
    themeColors: row.themeColors,
    decorativeElements: row.decorativeElements,
    ctaLabel: row.ctaLabel,
    ctaLink: row.ctaLink,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    showCountdown: row.showCountdown,
    sponsors: row.sponsors,
    showQrRegistration: row.showQrRegistration,
    featuredEventTitle: row.featuredEventTitle ?? event?.title ?? null,
    featuredEventTags: row.featuredEventTags,
    promoBannerText: row.promoBannerText,
    promoBannerLink: row.promoBannerLink,
  };

  return { schedule, content };
}

async function toResolved(row: KioskThemeRow): Promise<ResolvedKioskTheme> {
  const { content } = resolveScheduleAndContent(row);
  const qrToken = content.showQrRegistration && row.eventId ? (await ensureQRAsset({ type: "EVENT", eventId: row.eventId })).token : null;
  return { id: row.id, themeKey: row.themeKey, version: row.version, isDefault: row.isDefault, qrToken, ...content };
}

/**
 * "Only one theme is active at a time" — precedence: a manually pinned
 * theme wins outright (the escape hatch for "just make this one live right
 * now"); otherwise the highest-priority currently-scheduled theme wins,
 * ties broken by the most recently started; otherwise the org's Default
 * theme; otherwise null (kiosk falls back to its evergreen static content).
 */
export async function resolveActiveTheme(organizationId: string, now: Date = new Date()): Promise<ResolvedKioskTheme | null> {
  const rows = latestPerThemeKey(await fetchPublishedThemes(organizationId));
  if (rows.length === 0) return null;

  const pinned = rows.find((r) => r.isPinnedLive);
  if (pinned) return await toResolved(pinned);

  const scheduled = rows
    .filter((r) => !r.isDefault)
    .filter((r) => isThemeScheduledNow(resolveScheduleAndContent(r).schedule, now));

  if (scheduled.length > 0) {
    scheduled.sort((a, b) => b.priority - a.priority || b.startDate.getTime() - a.startDate.getTime());
    return await toResolved(scheduled[0]);
  }

  const fallback = rows.find((r) => r.isDefault);
  return fallback ? await toResolved(fallback) : null;
}
