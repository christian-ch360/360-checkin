import { describe, it, expect } from "vitest";
import { isThemeScheduledNow, type ThemeScheduleFields } from "@/features/kiosk/services/kiosk-theme-resolution.service";

function schedule(overrides: Partial<ThemeScheduleFields> = {}): ThemeScheduleFields {
  return {
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    startTime: null,
    endTime: null,
    recurrence: "NONE",
    recurrenceDaysOfWeek: [],
    recurrenceNthWeek: null,
    recurrenceWeekday: null,
    ...overrides,
  };
}

describe("isThemeScheduledNow", () => {
  it("matches an all-day NONE-recurrence theme within its date window", () => {
    const now = new Date("2026-06-15T10:00:00");
    expect(isThemeScheduledNow(schedule(), now)).toBe(true);
  });

  it("rejects a date outside the start/end window", () => {
    const now = new Date("2027-01-01T10:00:00");
    expect(isThemeScheduledNow(schedule(), now)).toBe(false);
  });

  it("respects a same-day start/end time-of-day window", () => {
    const s = schedule({ startTime: "18:00", endTime: "21:00" });
    expect(isThemeScheduledNow(s, new Date("2026-06-15T19:30:00"))).toBe(true);
    expect(isThemeScheduledNow(s, new Date("2026-06-15T17:00:00"))).toBe(false);
    expect(isThemeScheduledNow(s, new Date("2026-06-15T22:00:00"))).toBe(false);
  });

  it("handles an overnight time window that wraps past midnight", () => {
    const s = schedule({ startTime: "22:00", endTime: "02:00" });
    expect(isThemeScheduledNow(s, new Date("2026-06-15T23:30:00"))).toBe(true);
    expect(isThemeScheduledNow(s, new Date("2026-06-15T01:00:00"))).toBe(true);
    expect(isThemeScheduledNow(s, new Date("2026-06-15T12:00:00"))).toBe(false);
  });

  it("WEEKLY recurrence only matches the configured days of week", () => {
    // Wednesday = 3
    const s = schedule({ recurrence: "WEEKLY", recurrenceDaysOfWeek: [3] });
    expect(isThemeScheduledNow(s, new Date("2026-07-01T12:00:00"))).toBe(true); // a Wednesday
    expect(isThemeScheduledNow(s, new Date("2026-07-02T12:00:00"))).toBe(false); // a Thursday
  });

  it("WEEKLY recurrence still respects the outer date window", () => {
    const s = schedule({ recurrence: "WEEKLY", recurrenceDaysOfWeek: [3], startDate: new Date("2026-08-01"), endDate: new Date("2026-08-31") });
    expect(isThemeScheduledNow(s, new Date("2026-07-01T12:00:00"))).toBe(false); // right weekday, wrong month
  });

  it("MONTHLY_NTH_WEEKDAY matches only the nth occurrence of that weekday", () => {
    // "Every First Monday" — Monday = 1
    const s = schedule({ recurrence: "MONTHLY_NTH_WEEKDAY", recurrenceNthWeek: 1, recurrenceWeekday: 1 });
    // 2026-08-03 is the first Monday of August 2026.
    expect(isThemeScheduledNow(s, new Date("2026-08-03T12:00:00"))).toBe(true);
    // 2026-08-10 is the second Monday.
    expect(isThemeScheduledNow(s, new Date("2026-08-10T12:00:00"))).toBe(false);
  });

  it("MONTHLY_NTH_WEEKDAY nth=5 means the last occurrence in the month", () => {
    const s = schedule({ recurrence: "MONTHLY_NTH_WEEKDAY", recurrenceNthWeek: 5, recurrenceWeekday: 1 });
    // 2026-08-31 is the last Monday of August 2026 (5th occurrence).
    expect(isThemeScheduledNow(s, new Date("2026-08-31T12:00:00"))).toBe(true);
    expect(isThemeScheduledNow(s, new Date("2026-08-24T12:00:00"))).toBe(false);
  });

  it("MONTHLY_NTH_WEEKDAY with missing nth/weekday never matches", () => {
    const s = schedule({ recurrence: "MONTHLY_NTH_WEEKDAY", recurrenceNthWeek: null, recurrenceWeekday: 1 });
    expect(isThemeScheduledNow(s, new Date("2026-08-03T12:00:00"))).toBe(false);
  });
});
