import type { KioskRecurrence, KioskThemeStatus } from "@prisma/client";

/**
 * Pure scheduling predicate — no "server-only" tag (mirrors
 * agency-permissions.ts's shape) so the exact same logic that decides which
 * theme is live on the kiosk can also power the Theme Editor's "Preview as
 * Live" date/time simulation in the browser, guaranteeing they never
 * disagree about what "scheduled now" means.
 *
 * This file is the SINGLE source of truth for kiosk theme scheduling math —
 * every consumer (live kiosk resolution, both the server- and client-side
 * "display status" badges, the editor's "Would Be Live" check, and the hero's
 * "Today/Tomorrow/Tonight" label) imports from here rather than
 * reimplementing any of it, so there is exactly one place that can be wrong.
 */

export type ThemeScheduleFields = {
  startDate: Date;
  endDate: Date;
  startTime: string | null;
  endTime: string | null;
  recurrence: KioskRecurrence;
  recurrenceDaysOfWeek: number[];
  recurrenceNthWeek: number | null;
  recurrenceWeekday: number | null;
};

// startDate/endDate are civil "calendar dates" (e.g. "August 8") ENCODED as UTC midnight of the
// chosen day — see kiosk-theme.service.ts. They have no timezone of their own; UTC accessors are
// just how the exact calendar day the admin picked gets decoded back out, regardless of what
// timezone the code happens to run in.
export function startOfUTCDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// `now`, by contrast, is a genuine real-time instant — "is this today?" is inherently a LOCAL
// question. Decoding `now` with UTC accessors (as this file previously did) answers "is this
// today in UTC?" instead, which silently disagrees with the viewer's own calendar for several
// hours around every local midnight in any timezone other than UTC+0. Local accessors recover the
// viewer's actual calendar day, exactly like theme.startDate's UTC accessors recover the admin's.
export function startOfLocalDay(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function isWithinDateWindow(startDate: Date, endDate: Date, now: Date): boolean {
  const day = startOfLocalDay(now);
  return day >= startOfUTCDay(startDate) && day <= startOfUTCDay(endDate);
}

function parseHHmm(value: string): { hours: number; minutes: number } {
  const [h, m] = value.split(":").map((n) => Number.parseInt(n, 10));
  return { hours: Number.isFinite(h) ? h : 0, minutes: Number.isFinite(m) ? m : 0 };
}

function isWithinTimeWindow(startTime: string | null, endTime: string | null, now: Date): boolean {
  if (!startTime && !endTime) return true; // all-day
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = parseHHmm(startTime ?? "00:00");
  const end = parseHHmm(endTime ?? "23:59");
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  if (startMinutes <= endMinutes) return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  // Overnight window (e.g. 22:00 – 02:00).
  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
}

/** nth===5 is treated as "last" (covers months where the weekday only occurs 4 times). */
function isNthWeekdayOfMonth(date: Date, nth: number, weekday: number): boolean {
  if (date.getDay() !== weekday) return false;
  if (nth === 5) {
    const nextWeek = new Date(date);
    nextWeek.setDate(date.getDate() + 7);
    return nextWeek.getMonth() !== date.getMonth();
  }
  return Math.ceil(date.getDate() / 7) === nth;
}

/**
 * "Automatically activate and deactivate. No manual switching required."
 * Every branch is independently unit-testable and has no side effects.
 */
export function isThemeScheduledNow(theme: ThemeScheduleFields, now: Date = new Date()): boolean {
  if (!isWithinDateWindow(theme.startDate, theme.endDate, now)) return false;
  if (!isWithinTimeWindow(theme.startTime, theme.endTime, now)) return false;

  if (theme.recurrence === "WEEKLY") {
    return theme.recurrenceDaysOfWeek.includes(now.getDay());
  }
  if (theme.recurrence === "MONTHLY_NTH_WEEKDAY") {
    if (theme.recurrenceNthWeek == null || theme.recurrenceWeekday == null) return false;
    return isNthWeekdayOfMonth(now, theme.recurrenceNthWeek, theme.recurrenceWeekday);
  }
  return true; // NONE — the date+time window alone is the whole schedule
}

/** "Theme Status (Live / Scheduled / Draft)" — the dashboard-facing label, distinct from the
 * stored KioskThemeStatus enum (PUBLISHED can mean either "Live" or "Scheduled" depending on
 * whether its own window has arrived yet). Single implementation shared by the server-side
 * dashboard/list views and the client-side Theme Editor top bar — previously hand-duplicated in
 * both places, which is exactly how they could silently drift apart. */
export type KioskThemeDisplayStatus = "LIVE" | "SCHEDULED" | "DRAFT" | "ARCHIVED";

export function computeDisplayStatus(
  theme: { status: KioskThemeStatus; isPinnedLive: boolean } & ThemeScheduleFields,
  now: Date = new Date()
): KioskThemeDisplayStatus {
  if (theme.status === "DRAFT") return "DRAFT";
  if (theme.status === "ARCHIVED") return "ARCHIVED";
  if (theme.isPinnedLive || isThemeScheduledNow(theme, now)) return "LIVE";
  return "SCHEDULED";
}

/**
 * "Tonight" / "Tomorrow" / long-form date label for the kiosk hero and the admin preview panel.
 * `date` is a stored civil date (UTC-decoded); `today` is a real instant (LOCAL-decoded) — see the
 * comments on startOfUTCDay/startOfLocalDay above for why these must NOT use the same accessor.
 */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function formatDateLabel(date: Date, today: Date): string {
  const dateKey = startOfUTCDay(date);
  const todayKey = startOfLocalDay(today);
  if (dateKey === todayKey) return "Tonight";
  if (dateKey === todayKey + ONE_DAY_MS) return "Tomorrow";
  // timeZone: "UTC" keeps the rendered weekday/month/day in sync with the UTC-decoded civil date
  // above — omitting it would silently reintroduce the same off-by-one for the long-format path.
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}
