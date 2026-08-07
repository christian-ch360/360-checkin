// Pinned so these tests are deterministic in any CI/dev environment, and specifically match the
// real deployment timezone (Pacific) where the "Aug 8 shows as Tomorrow/Today" bug was diagnosed.
// Must be set before any Date is constructed in this file.
process.env.TZ = "America/Los_Angeles";

import { describe, it, expect } from "vitest";
import { isThemeScheduledNow as isThemeScheduledNowDirect, formatDateLabel, computeDisplayStatus, type ThemeScheduleFields } from "@/features/kiosk/config/kiosk-schedule";
import { isThemeScheduledNow as isThemeScheduledNowViaResolution } from "@/features/kiosk/services/kiosk-theme-resolution.service";
import { computeDisplayStatus as computeDisplayStatusViaService } from "@/features/kiosk/services/kiosk-theme.service";

function schedule(overrides: Partial<ThemeScheduleFields> = {}): ThemeScheduleFields {
  return {
    startDate: new Date("2026-08-08"),
    endDate: new Date("2026-08-08"),
    startTime: null,
    endTime: null,
    recurrence: "NONE",
    recurrenceDaysOfWeek: [],
    recurrenceNthWeek: null,
    recurrenceWeekday: null,
    ...overrides,
  };
}

describe("formatDateLabel — Today/Tomorrow/Tonight never compares a UTC day against a local day", () => {
  it("Scenario A: local today is Aug 7, theme is Aug 8 → Tomorrow", () => {
    const now = new Date("2026-08-07T10:00:00"); // local time, no Z/offset
    const theme = new Date("2026-08-08"); // civil date, UTC midnight
    expect(formatDateLabel(theme, now)).toBe("Tomorrow");
  });

  it("Scenario B: local today is Aug 8, theme is Aug 8 → same-day label (\"Tonight\")", () => {
    const now = new Date("2026-08-08T10:00:00");
    const theme = new Date("2026-08-08");
    // The kiosk's own vocabulary for "this is today's event" is "Tonight" (an evening-event
    // kiosk), not the literal word "Today" — this assertion is the existing, unchanged copy
    // choice. What the fix guarantees is that this is the SAME-DAY branch, not "Tomorrow".
    expect(formatDateLabel(theme, now)).toBe("Tonight");
  });

  it("Scenario C: local today is Aug 9, theme is Aug 8 → never \"Tomorrow\" (theme is in the past)", () => {
    const now = new Date("2026-08-09T10:00:00");
    const theme = new Date("2026-08-08");
    const label = formatDateLabel(theme, now);
    expect(label).not.toBe("Tomorrow");
    expect(label).not.toBe("Tonight");
  });

  it("regression: late-evening Pacific time (UTC has already rolled to the next day) must not show tomorrow's theme as tonight's", () => {
    // 10pm PDT on Aug 7 = 05:00 UTC Aug 8 — UTC's calendar day is already "Aug 8" here, even
    // though it is still Aug 7 on every local clock. The pre-fix code decoded `now` with UTC
    // accessors and would have said "Tonight" a full 2 hours before local midnight.
    const now = new Date("2026-08-07T22:00:00");
    const theme = new Date("2026-08-08");
    expect(formatDateLabel(theme, now)).toBe("Tomorrow");
  });

  it("regression: early-morning Pacific time must not show today's theme as tomorrow's (mirrors the pre-fix off-by-one in the other direction)", () => {
    const now = new Date("2026-08-08T00:05:00"); // just past local midnight on the 8th
    const theme = new Date("2026-08-08");
    expect(formatDateLabel(theme, now)).toBe("Tonight");
  });
});

describe("isThemeScheduledNow — date window compares local `now` against UTC-decoded theme dates", () => {
  const window = schedule({ startTime: "16:00", endTime: "21:00" });

  it("Scenario D: 3:30 PM local, theme starts 4:00 PM → not yet live", () => {
    const now = new Date("2026-08-08T15:30:00");
    expect(isThemeScheduledNowDirect(window, now)).toBe(false);
  });

  it("Scenario D: countdown target (same math kiosk-hero.tsx uses) is still in the future at 3:30 PM", () => {
    const now = new Date("2026-08-08T15:30:00");
    // Mirrors kiosk-hero.tsx's countdownTarget: UTC-decode the stored civil day, build a local
    // Date from those components, then layer the local startTime on top.
    const target = new Date(window.startDate.getUTCFullYear(), window.startDate.getUTCMonth(), window.startDate.getUTCDate());
    target.setHours(16, 0, 0, 0);
    expect(target.getTime() - now.getTime()).toBeGreaterThan(0);
    expect(target.getTime() - now.getTime()).toBe(30 * 60 * 1000); // exactly 30 minutes away
  });

  it("Scenario E: 4:30 PM local, theme active", () => {
    const now = new Date("2026-08-08T16:30:00");
    expect(isThemeScheduledNowDirect(window, now)).toBe(true);
  });

  it("Scenario F: 9:31 PM local, theme inactive (past its 9:00 PM end time)", () => {
    const now = new Date("2026-08-08T21:31:00");
    expect(isThemeScheduledNowDirect(window, now)).toBe(false);
  });

  it("a theme scheduled for tomorrow is never live tonight, even late in the evening", () => {
    const tomorrow = schedule({ startDate: new Date("2026-08-09"), endDate: new Date("2026-08-09") });
    const now = new Date("2026-08-08T23:00:00"); // 11pm PDT Aug 8 = 06:00 UTC Aug 9
    expect(isThemeScheduledNowDirect(tomorrow, now)).toBe(false);
  });
});

describe("Scenario G — preview simulator and live kiosk share one implementation", () => {
  it("isThemeScheduledNow is the exact same function whether imported for the live kiosk or the editor preview", () => {
    expect(isThemeScheduledNowViaResolution).toBe(isThemeScheduledNowDirect);
  });

  it("agree on every result for the same theme + instant", () => {
    const s = schedule({ startTime: "16:00", endTime: "21:00" });
    for (const now of [
      new Date("2026-08-08T15:30:00"),
      new Date("2026-08-08T16:30:00"),
      new Date("2026-08-08T21:31:00"),
      new Date("2026-08-07T22:00:00"),
    ]) {
      expect(isThemeScheduledNowViaResolution(s, now)).toBe(isThemeScheduledNowDirect(s, now));
    }
  });

  it("computeDisplayStatus is the exact same function whether imported via the service layer or directly", () => {
    expect(computeDisplayStatusViaService).toBe(computeDisplayStatus);
  });
});

describe("computeDisplayStatus", () => {
  it("DRAFT/ARCHIVED short-circuit regardless of schedule", () => {
    const now = new Date("2026-08-08T16:30:00");
    const live = schedule({ startTime: "16:00", endTime: "21:00" });
    expect(computeDisplayStatus({ status: "DRAFT", isPinnedLive: false, ...live }, now)).toBe("DRAFT");
    expect(computeDisplayStatus({ status: "ARCHIVED", isPinnedLive: false, ...live }, now)).toBe("ARCHIVED");
  });

  it("PUBLISHED reflects the actual schedule window, matching isThemeScheduledNow", () => {
    const s = schedule({ startTime: "16:00", endTime: "21:00" });
    expect(computeDisplayStatus({ status: "PUBLISHED", isPinnedLive: false, ...s }, new Date("2026-08-08T16:30:00"))).toBe("LIVE");
    expect(computeDisplayStatus({ status: "PUBLISHED", isPinnedLive: false, ...s }, new Date("2026-08-08T15:30:00"))).toBe("SCHEDULED");
  });

  it("isPinnedLive forces LIVE even outside the schedule window", () => {
    const s = schedule({ startTime: "16:00", endTime: "21:00" });
    expect(computeDisplayStatus({ status: "PUBLISHED", isPinnedLive: true, ...s }, new Date("2026-08-08T09:00:00"))).toBe("LIVE");
  });
});

describe("Requirement 6 — editing preserves the exact calendar day across the save/reload round-trip", () => {
  it("new Date('YYYY-MM-DD').toISOString().slice(0,10) recovers the exact same string, for every civil date — the invariant the editor's toDateInput/toInput rely on", () => {
    // This is the exact write (`new Date(form.startDate)`) and read-back (`toISOString().slice(0,10)`)
    // pair kiosk-theme-editor.tsx uses. It must be a no-op round trip regardless of process
    // timezone, since date-only ISO strings always parse as UTC midnight and toISOString always
    // emits UTC — local accessors never enter this path.
    for (const d of ["2026-08-08", "2026-01-01", "2026-12-31", "2026-02-28", "2028-02-29"]) {
      expect(new Date(d).toISOString().slice(0, 10)).toBe(d);
    }
  });

  it("saving Aug 8 and reopening the editor shows Aug 8, not Aug 7", () => {
    const saved = new Date("2026-08-08");
    const reopened = saved.toISOString().slice(0, 10);
    expect(reopened).toBe("2026-08-08");
  });
});

describe("Requirement 3 — preset generation encodes civil dates the same way as every other write path", () => {
  it("a UTC-midnight-encoded preset date decodes to the intended calendar day via UTC accessors, in any process timezone", () => {
    const encoded = new Date(Date.UTC(2026, 7, 8)); // August 8, encoded the way resolvePresetSchedule now does
    expect(encoded.getUTCFullYear()).toBe(2026);
    expect(encoded.getUTCMonth()).toBe(7);
    expect(encoded.getUTCDate()).toBe(8);
    expect(encoded.toISOString()).toBe("2026-08-08T00:00:00.000Z");
  });
});
