import type { KioskRecurrence } from "@prisma/client";

/**
 * Pure scheduling predicate — no "server-only" tag (mirrors
 * agency-permissions.ts's shape) so the exact same logic that decides which
 * theme is live on the kiosk can also power the Theme Editor's "Preview as
 * Live" date/time simulation in the browser, guaranteeing they never
 * disagree about what "scheduled now" means.
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

function isWithinDateWindow(startDate: Date, endDate: Date, now: Date): boolean {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const day = startOfDay(now);
  return day >= startOfDay(startDate) && day <= startOfDay(endDate);
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
