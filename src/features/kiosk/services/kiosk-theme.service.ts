import "server-only";

import { randomUUID } from "node:crypto";
import type {
  KioskAnimationStyle,
  KioskButtonStyle,
  KioskDecorativeElement,
  KioskLogoVariant,
  KioskRecurrence,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { KIOSK_THEME_PRESETS, resolvePresetSchedule } from "@/features/kiosk/config/kiosk-theme-presets.config";
import { computeDisplayStatus, type KioskThemeDisplayStatus } from "@/features/kiosk/config/kiosk-schedule";

export { computeDisplayStatus, type KioskThemeDisplayStatus };

export type KioskThemeInput = {
  name: string;
  headline: string;
  kioskTitle?: string | null;
  subheadline?: string | null;
  location?: string | null;
  parkingInfo?: string | null;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  logoOverrideUrl?: string | null;
  logoVariant?: KioskLogoVariant;
  heroLogoSize?: number | null;
  heroTitleSize?: number | null;
  heroSubtitleSize?: number | null;
  heroDateTimeSize?: number | null;
  heroLocationSize?: number | null;
  heroCountdownSize?: number | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  buttonColor?: string | null;
  buttonTextColor?: string | null;
  buttonStyle?: KioskButtonStyle;
  textColor?: string | null;
  animationStyle?: KioskAnimationStyle;
  themeColors?: { name: string; hex: string }[] | null;
  decorativeElements?: KioskDecorativeElement[];
  ctaLabel?: string | null;
  ctaLink?: string | null;
  showQrRegistration?: boolean;
  featuredEventTitle?: string | null;
  featuredEventTags?: string[];
  promoBannerText?: string | null;
  promoBannerLink?: string | null;
  startDate: Date;
  endDate: Date;
  startTime?: string | null;
  endTime?: string | null;
  recurrence?: KioskRecurrence;
  recurrenceDaysOfWeek?: number[];
  recurrenceNthWeek?: number | null;
  recurrenceWeekday?: number | null;
  showCountdown?: boolean;
  eventId?: string | null;
  sponsors?: { name: string; logoUrl: string; message?: string; ctaLabel?: string; ctaLink?: string }[] | null;
  checkInMessage?: string | null;
  themedActionButtons?: boolean;
};

/**
 * Self-healing seed, same convention as ensureQRAsset/ensureReferralCode — a
 * brand-new organization has zero KioskTheme rows, so resolveActiveTheme
 * would otherwise return null and the kiosk would have nothing to render at
 * all. Copies the exact pre-dynamic-kiosk static copy so day one behavior
 * is unchanged until an admin actually customizes it.
 */
export async function ensureDefaultTheme(organizationId: string): Promise<void> {
  const hasAny = await prisma.kioskTheme.findFirst({ where: { organizationId }, select: { id: true } });
  if (hasAny) return;

  await prisma.kioskTheme.create({
    data: {
      organizationId,
      themeKey: randomUUID(),
      version: 1,
      status: "PUBLISHED",
      isDefault: true,
      publishedAt: new Date(),
      name: "Default",
      headline: "Welcome to CreatorHub360",
      subheadline: "Check in or apply to become a member.",
      startDate: new Date("2020-01-01"),
      endDate: new Date("2099-12-31"),
    },
  });
}

/**
 * Self-healing seed for the three spec'd theme presets (Christmas, Halloween,
 * Whiskey Wednesday) — same idempotent convention as ensureDefaultTheme, so
 * every environment ships with real, working examples of the theming system
 * instead of an empty list. Seeded PUBLISHED (so automatic scheduling can
 * pick them up the moment their window arrives) but never isDefault or
 * isPinnedLive — they're additive to whatever default/other themes already
 * exist. Skips any preset whose name already exists for this org, so it's
 * safe to call on every kiosk load without duplicating rows an admin may
 * have since edited or renamed.
 */
export async function ensureDefaultThemePresets(organizationId: string): Promise<void> {
  const existingNames = new Set(
    (await prisma.kioskTheme.findMany({ where: { organizationId }, select: { name: true } })).map((t) => t.name)
  );

  const now = new Date();
  for (const preset of KIOSK_THEME_PRESETS) {
    if (existingNames.has(preset.name)) continue;
    const { schedule, ...rest } = preset;
    await prisma.kioskTheme.create({
      data: {
        organizationId,
        themeKey: randomUUID(),
        version: 1,
        status: "PUBLISHED",
        publishedAt: now,
        ...toWriteData({ ...rest, ...resolvePresetSchedule(schedule, now) }),
      },
    });
  }
}

async function getLatestVersionRow(organizationId: string, themeKey: string) {
  return prisma.kioskTheme.findFirst({
    where: { organizationId, themeKey },
    orderBy: { version: "desc" },
  });
}

/** Every themeKey's current (highest-version) row, any status — powers the admin theme list. */
export async function listThemes(organizationId: string) {
  const rows = await prisma.kioskTheme.findMany({
    where: { organizationId },
    orderBy: [{ themeKey: "asc" }, { version: "desc" }],
    include: {
      publishedBy: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
      event: { select: { id: true, title: true } },
    },
  });
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!byKey.has(row.themeKey)) byKey.set(row.themeKey, row);
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getThemeByKey(organizationId: string, themeKey: string) {
  return getLatestVersionRow(organizationId, themeKey);
}

/** Full immutable version history for one theme, newest first — "Version History" / rollback UI. */
export async function getThemeVersionHistory(organizationId: string, themeKey: string) {
  return prisma.kioskTheme.findMany({
    where: { organizationId, themeKey },
    orderBy: { version: "desc" },
    include: { publishedBy: { select: { fullName: true } }, createdBy: { select: { fullName: true } } },
  });
}

export type KioskThemeActionResult = { success: true; themeKey: string } | { success: false; error: string };

/** "Create Theme" — always starts life as version 1, DRAFT. */
export async function createTheme(organizationId: string, actorId: string, input: KioskThemeInput): Promise<KioskThemeActionResult> {
  const themeKey = randomUUID();
  await prisma.kioskTheme.create({
    data: {
      organizationId,
      themeKey,
      version: 1,
      status: "DRAFT",
      createdById: actorId,
      ...toWriteData(input),
    },
  });
  return { success: true, themeKey };
}

/**
 * "Save Draft" — edits a theme's current DRAFT-in-progress version. If the
 * latest version is still DRAFT, updates it in place (no history churn for
 * unpublished work-in-progress). If the latest version has already been
 * PUBLISHED (or ARCHIVED), clones it forward into a brand-new DRAFT version
 * instead of mutating history — "Maintain version history for every theme."
 */
export async function saveThemeDraft(
  organizationId: string,
  themeKey: string,
  actorId: string,
  input: KioskThemeInput
): Promise<KioskThemeActionResult> {
  const latest = await getLatestVersionRow(organizationId, themeKey);
  if (!latest) return { success: false, error: "Theme not found." };

  if (latest.status === "DRAFT") {
    await prisma.kioskTheme.update({ where: { id: latest.id }, data: toWriteData(input) });
    return { success: true, themeKey };
  }

  await prisma.kioskTheme.create({
    data: {
      organizationId,
      themeKey,
      version: latest.version + 1,
      status: "DRAFT",
      createdById: actorId,
      ...toWriteData(input),
    },
  });
  return { success: true, themeKey };
}

/** "Publish Now" / "Schedule Publish" — publishing doesn't unpublish other themes; several
 * themes are routinely PUBLISHED at once (that's what makes future scheduling possible). Whether
 * a published theme is actually live right now is decided by kiosk-theme-resolution.service.ts
 * against its own start/end window — "Schedule Publish" is simply publishing a theme whose window
 * hasn't started yet. */
export async function publishTheme(organizationId: string, themeKey: string, actorId: string): Promise<KioskThemeActionResult> {
  const latest = await getLatestVersionRow(organizationId, themeKey);
  if (!latest) return { success: false, error: "Theme not found." };
  if (latest.status === "PUBLISHED") return { success: true, themeKey };

  await prisma.kioskTheme.update({
    where: { id: latest.id },
    data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: actorId },
  });
  return { success: true, themeKey };
}

export async function archiveTheme(organizationId: string, themeKey: string): Promise<KioskThemeActionResult> {
  const latest = await getLatestVersionRow(organizationId, themeKey);
  if (!latest) return { success: false, error: "Theme not found." };
  await prisma.kioskTheme.update({ where: { id: latest.id }, data: { status: "ARCHIVED", isPinnedLive: false } });
  return { success: true, themeKey };
}

/** "Duplicate Theme" — mints a fresh themeKey (its own independent version history), never
 * touches the source theme. */
export async function duplicateTheme(organizationId: string, sourceThemeKey: string, actorId: string): Promise<KioskThemeActionResult> {
  const source = await getLatestVersionRow(organizationId, sourceThemeKey);
  if (!source) return { success: false, error: "Theme not found." };

  const themeKey = randomUUID();
  await prisma.kioskTheme.create({
    data: {
      organizationId,
      themeKey,
      version: 1,
      status: "DRAFT",
      createdById: actorId,
      name: `${source.name} (Copy)`,
      headline: source.headline,
      kioskTitle: source.kioskTitle,
      subheadline: source.subheadline,
      location: source.location,
      parkingInfo: source.parkingInfo,
      backgroundImageUrl: source.backgroundImageUrl,
      backgroundVideoUrl: source.backgroundVideoUrl,
      logoOverrideUrl: source.logoOverrideUrl,
      logoVariant: source.logoVariant,
      heroLogoSize: source.heroLogoSize,
      heroTitleSize: source.heroTitleSize,
      heroSubtitleSize: source.heroSubtitleSize,
      heroDateTimeSize: source.heroDateTimeSize,
      heroLocationSize: source.heroLocationSize,
      heroCountdownSize: source.heroCountdownSize,
      primaryColor: source.primaryColor,
      secondaryColor: source.secondaryColor,
      accentColor: source.accentColor,
      buttonColor: source.buttonColor,
      buttonTextColor: source.buttonTextColor,
      buttonStyle: source.buttonStyle,
      textColor: source.textColor,
      animationStyle: source.animationStyle,
      themeColors: source.themeColors ?? undefined,
      decorativeElements: source.decorativeElements,
      ctaLabel: source.ctaLabel,
      ctaLink: source.ctaLink,
      showQrRegistration: source.showQrRegistration,
      featuredEventTitle: source.featuredEventTitle,
      featuredEventTags: source.featuredEventTags,
      promoBannerText: source.promoBannerText,
      promoBannerLink: source.promoBannerLink,
      startDate: source.startDate,
      endDate: source.endDate,
      startTime: source.startTime,
      endTime: source.endTime,
      recurrence: source.recurrence,
      recurrenceDaysOfWeek: source.recurrenceDaysOfWeek,
      recurrenceNthWeek: source.recurrenceNthWeek,
      recurrenceWeekday: source.recurrenceWeekday,
      showCountdown: source.showCountdown,
      eventId: source.eventId,
      sponsors: source.sponsors ?? undefined,
      checkInMessage: source.checkInMessage,
      themedActionButtons: source.themedActionButtons,
    },
  });
  return { success: true, themeKey };
}

/** "Roll Back to Previous Version" — never rewrites history; creates a new PUBLISHED version
 * that copies the target version's content forward, exactly like publishing a fresh edit. */
export async function rollbackTheme(
  organizationId: string,
  themeKey: string,
  targetVersion: number,
  actorId: string
): Promise<KioskThemeActionResult> {
  const [latest, target] = await Promise.all([
    getLatestVersionRow(organizationId, themeKey),
    prisma.kioskTheme.findFirst({ where: { organizationId, themeKey, version: targetVersion } }),
  ]);
  if (!latest || !target) return { success: false, error: "Theme version not found." };

  await prisma.kioskTheme.create({
    data: {
      organizationId,
      themeKey,
      version: latest.version + 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
      publishedById: actorId,
      createdById: actorId,
      changeSummary: `Rolled back to version ${targetVersion}`,
      name: target.name,
      headline: target.headline,
      kioskTitle: target.kioskTitle,
      subheadline: target.subheadline,
      location: target.location,
      parkingInfo: target.parkingInfo,
      backgroundImageUrl: target.backgroundImageUrl,
      backgroundVideoUrl: target.backgroundVideoUrl,
      logoOverrideUrl: target.logoOverrideUrl,
      logoVariant: target.logoVariant,
      heroLogoSize: target.heroLogoSize,
      heroTitleSize: target.heroTitleSize,
      heroSubtitleSize: target.heroSubtitleSize,
      heroDateTimeSize: target.heroDateTimeSize,
      heroLocationSize: target.heroLocationSize,
      heroCountdownSize: target.heroCountdownSize,
      primaryColor: target.primaryColor,
      secondaryColor: target.secondaryColor,
      accentColor: target.accentColor,
      buttonColor: target.buttonColor,
      buttonTextColor: target.buttonTextColor,
      buttonStyle: target.buttonStyle,
      textColor: target.textColor,
      animationStyle: target.animationStyle,
      themeColors: target.themeColors ?? undefined,
      decorativeElements: target.decorativeElements,
      ctaLabel: target.ctaLabel,
      ctaLink: target.ctaLink,
      showQrRegistration: target.showQrRegistration,
      featuredEventTitle: target.featuredEventTitle,
      featuredEventTags: target.featuredEventTags,
      promoBannerText: target.promoBannerText,
      promoBannerLink: target.promoBannerLink,
      startDate: target.startDate,
      endDate: target.endDate,
      startTime: target.startTime,
      endTime: target.endTime,
      recurrence: target.recurrence,
      recurrenceDaysOfWeek: target.recurrenceDaysOfWeek,
      recurrenceNthWeek: target.recurrenceNthWeek,
      recurrenceWeekday: target.recurrenceWeekday,
      showCountdown: target.showCountdown,
      eventId: target.eventId,
      sponsors: target.sponsors ?? undefined,
      isDefault: target.isDefault,
      priority: target.priority,
      checkInMessage: target.checkInMessage,
      themedActionButtons: target.themedActionButtons,
    },
  });
  return { success: true, themeKey };
}

/** "Only one theme may be active at a time" for the manual-pin escape hatch specifically —
 * pinning one theme live always unpins every other theme in the org first. */
export async function setThemePinnedLive(organizationId: string, themeKey: string, pinned: boolean): Promise<KioskThemeActionResult> {
  const latest = await getLatestVersionRow(organizationId, themeKey);
  if (!latest) return { success: false, error: "Theme not found." };
  if (pinned && latest.status !== "PUBLISHED") {
    return { success: false, error: "Only a published theme can be pinned live." };
  }

  await prisma.$transaction([
    prisma.kioskTheme.updateMany({ where: { organizationId, isPinnedLive: true }, data: { isPinnedLive: false } }),
    ...(pinned ? [prisma.kioskTheme.update({ where: { id: latest.id }, data: { isPinnedLive: true } })] : []),
  ]);
  return { success: true, themeKey };
}

/**
 * "Delete Theme" — a genuine hard delete of every version under this
 * themeKey, distinct from Archive (which is soft and keeps history). Blocked
 * for the org's default fallback theme (the kiosk would have nothing to
 * render outside any scheduled window) and for the currently pinned-live
 * theme (deleting what's on-screen right now would be a footgun) — unpin or
 * reassign default first.
 */
export async function deleteTheme(organizationId: string, themeKey: string): Promise<KioskThemeActionResult> {
  const latest = await getLatestVersionRow(organizationId, themeKey);
  if (!latest) return { success: false, error: "Theme not found." };
  if (latest.isDefault) return { success: false, error: "Can't delete the default theme — set another theme as default first." };
  if (latest.isPinnedLive) return { success: false, error: "Can't delete a theme that's pinned live — unpin it first." };

  await prisma.kioskTheme.deleteMany({ where: { organizationId, themeKey } });
  return { success: true, themeKey };
}

export async function setThemeDefault(organizationId: string, themeKey: string): Promise<KioskThemeActionResult> {
  const latest = await getLatestVersionRow(organizationId, themeKey);
  if (!latest) return { success: false, error: "Theme not found." };
  if (latest.status !== "PUBLISHED") return { success: false, error: "Only a published theme can be set as the default." };

  await prisma.$transaction([
    prisma.kioskTheme.updateMany({ where: { organizationId, isDefault: true }, data: { isDefault: false } }),
    prisma.kioskTheme.update({ where: { id: latest.id }, data: { isDefault: true } }),
  ]);
  return { success: true, themeKey };
}

function toWriteData(input: KioskThemeInput) {
  return {
    name: input.name,
    headline: input.headline,
    kioskTitle: input.kioskTitle ?? null,
    subheadline: input.subheadline ?? null,
    location: input.location ?? null,
    parkingInfo: input.parkingInfo ?? null,
    backgroundImageUrl: input.backgroundImageUrl ?? null,
    backgroundVideoUrl: input.backgroundVideoUrl ?? null,
    logoOverrideUrl: input.logoOverrideUrl ?? null,
    logoVariant: input.logoVariant ?? "DEFAULT",
    heroLogoSize: input.heroLogoSize ?? null,
    heroTitleSize: input.heroTitleSize ?? null,
    heroSubtitleSize: input.heroSubtitleSize ?? null,
    heroDateTimeSize: input.heroDateTimeSize ?? null,
    heroLocationSize: input.heroLocationSize ?? null,
    heroCountdownSize: input.heroCountdownSize ?? null,
    primaryColor: input.primaryColor ?? null,
    secondaryColor: input.secondaryColor ?? null,
    accentColor: input.accentColor ?? null,
    buttonColor: input.buttonColor ?? null,
    buttonTextColor: input.buttonTextColor ?? null,
    buttonStyle: input.buttonStyle ?? "SOLID",
    textColor: input.textColor ?? null,
    animationStyle: input.animationStyle ?? "FADE",
    themeColors: input.themeColors ?? undefined,
    decorativeElements: input.decorativeElements ?? [],
    ctaLabel: input.ctaLabel ?? null,
    ctaLink: input.ctaLink ?? null,
    showQrRegistration: input.showQrRegistration ?? false,
    featuredEventTitle: input.featuredEventTitle ?? null,
    featuredEventTags: input.featuredEventTags ?? [],
    promoBannerText: input.promoBannerText ?? null,
    promoBannerLink: input.promoBannerLink ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    recurrence: input.recurrence ?? "NONE",
    recurrenceDaysOfWeek: input.recurrenceDaysOfWeek ?? [],
    recurrenceNthWeek: input.recurrenceNthWeek ?? null,
    recurrenceWeekday: input.recurrenceWeekday ?? null,
    showCountdown: input.showCountdown ?? false,
    eventId: input.eventId ?? null,
    sponsors: input.sponsors ?? undefined,
    checkInMessage: input.checkInMessage ?? null,
    themedActionButtons: input.themedActionButtons ?? false,
  };
}
