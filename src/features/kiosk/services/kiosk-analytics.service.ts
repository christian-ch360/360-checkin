import "server-only";

import { subDays, startOfDay, format } from "date-fns";
import type { KioskInteractionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * "Analytics — Track: Theme Views, QR Scans, Registrations, Check-ins, CTA
 * Clicks, Event Signups." Deliberately fire-and-forget from every call
 * site (never awaited into a user-facing error) — a failed analytics write
 * must never break the kiosk flow it's describing, same convention as
 * logAgencyActivity.
 */
export async function recordKioskInteraction(
  organizationId: string,
  type: KioskInteractionType,
  options: { themeKey?: string | null; announcementId?: string | null; metadata?: Prisma.InputJsonValue } = {}
): Promise<void> {
  try {
    await prisma.kioskInteractionEvent.create({
      data: {
        organizationId,
        type,
        themeKey: options.themeKey ?? null,
        announcementId: options.announcementId ?? null,
        metadata: options.metadata,
      },
    });
  } catch (err) {
    console.error("recordKioskInteraction: failed to record interaction", err);
  }
}

export type KioskThemeAnalytics = {
  themeKey: string;
  views: number;
  qrScans: number;
  checkIns: number;
  registrations: number;
  ctaClicks: number;
  eventSignups: number;
};

const INTERACTION_FIELD: Record<KioskInteractionType, keyof Omit<KioskThemeAnalytics, "themeKey">> = {
  THEME_VIEW: "views",
  QR_SCAN: "qrScans",
  CHECK_IN: "checkIns",
  REGISTRATION: "registrations",
  CTA_CLICK: "ctaClicks",
  EVENT_SIGNUP: "eventSignups",
};

/** Per-theme interaction totals, all time — powers each theme's analytics card in the
 * Kiosk Manager. Grouped by `themeKey` so totals span every version of a theme's history. */
export async function getThemeAnalytics(organizationId: string): Promise<Record<string, KioskThemeAnalytics>> {
  const rows = await prisma.kioskInteractionEvent.groupBy({
    by: ["themeKey", "type"],
    where: { organizationId, themeKey: { not: null } },
    _count: { _all: true },
  });

  const byTheme: Record<string, KioskThemeAnalytics> = {};
  for (const row of rows) {
    if (!row.themeKey) continue;
    if (!byTheme[row.themeKey]) {
      byTheme[row.themeKey] = { themeKey: row.themeKey, views: 0, qrScans: 0, checkIns: 0, registrations: 0, ctaClicks: 0, eventSignups: 0 };
    }
    byTheme[row.themeKey][INTERACTION_FIELD[row.type]] = row._count._all;
  }
  return byTheme;
}

export type KioskDailyInteractionPoint = { date: string; views: number; qrScans: number; checkIns: number; registrations: number; ctaClicks: number; eventSignups: number };

/** Last 30 days, one point per day, org-wide (all themes combined) — for the "graphs comparing
 * theme performance over time" comparison chart, filtered client-side by theme when needed. */
export async function getInteractionTimeSeries(organizationId: string, days = 30): Promise<KioskDailyInteractionPoint[]> {
  const since = startOfDay(subDays(new Date(), days - 1));
  const rows = await prisma.kioskInteractionEvent.findMany({
    where: { organizationId, occurredAt: { gte: since } },
    select: { type: true, occurredAt: true },
  });

  const byDay = new Map<string, KioskDailyInteractionPoint>();
  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(), days - 1 - i), "MMM d");
    byDay.set(date, { date, views: 0, qrScans: 0, checkIns: 0, registrations: 0, ctaClicks: 0, eventSignups: 0 });
  }
  for (const row of rows) {
    const date = format(row.occurredAt, "MMM d");
    const point = byDay.get(date);
    if (!point) continue;
    point[INTERACTION_FIELD[row.type]] += 1;
  }
  return [...byDay.values()];
}
