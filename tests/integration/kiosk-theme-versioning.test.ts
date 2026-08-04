import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createTheme,
  saveThemeDraft,
  publishTheme,
  archiveTheme,
  duplicateTheme,
  rollbackTheme,
  setThemePinnedLive,
  setThemeDefault,
  deleteTheme,
  ensureDefaultThemePresets,
  getThemeByKey,
  getThemeVersionHistory,
  listThemes,
} from "@/features/kiosk/services/kiosk-theme.service";
import { resolveActiveTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let actorId: string;

function baseInput(overrides: Partial<Parameters<typeof createTheme>[2]> = {}) {
  return {
    name: "Test Theme",
    headline: "Test Headline",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    ...overrides,
  };
}

describe("Kiosk Theme versioning (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Kiosk ${runId}`, slug: `test-org-kiosk-${runId}` },
    });
    organizationId = org.id;

    const actor = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-KIOSK-${runId}`,
        fullName: "Kiosk Tester",
        email: `kiosk-tester-${runId}@example.com`,
        role: "STAFF",
        status: "ACTIVE",
        systemRole: "SUPER_ADMIN",
      },
    });
    actorId = actor.id;
  });

  afterAll(async () => {
    await prisma.kioskInteractionEvent.deleteMany({ where: { organizationId } });
    await prisma.kioskTheme.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("creates a theme as DRAFT version 1", async () => {
    const result = await createTheme(organizationId, actorId, baseInput({ name: "Draft Lifecycle" }));
    expect(result.success).toBe(true);
    if (!result.success) return;

    const latest = await getThemeByKey(organizationId, result.themeKey);
    expect(latest?.status).toBe("DRAFT");
    expect(latest?.version).toBe(1);
  });

  it("saveThemeDraft edits a DRAFT version in place (no new version)", async () => {
    const created = await createTheme(organizationId, actorId, baseInput({ name: "In-place Edit" }));
    if (!created.success) throw new Error("setup failed");

    await saveThemeDraft(organizationId, created.themeKey, actorId, baseInput({ name: "In-place Edit (edited)" }));

    const history = await getThemeVersionHistory(organizationId, created.themeKey);
    expect(history).toHaveLength(1);
    expect(history[0].name).toBe("In-place Edit (edited)");
  });

  it("editing an already-PUBLISHED theme creates a new DRAFT version instead of mutating history", async () => {
    const created = await createTheme(organizationId, actorId, baseInput({ name: "Publish Then Edit" }));
    if (!created.success) throw new Error("setup failed");
    await publishTheme(organizationId, created.themeKey, actorId);

    await saveThemeDraft(organizationId, created.themeKey, actorId, baseInput({ name: "Publish Then Edit v2" }));

    const history = await getThemeVersionHistory(organizationId, created.themeKey);
    expect(history).toHaveLength(2);
    const v1 = history.find((h) => h.version === 1);
    const v2 = history.find((h) => h.version === 2);
    expect(v1?.status).toBe("PUBLISHED");
    expect(v1?.name).toBe("Publish Then Edit");
    expect(v2?.status).toBe("DRAFT");
    expect(v2?.name).toBe("Publish Then Edit v2");
  });

  it("rollback creates a new PUBLISHED version copying an older version's content, never rewriting history", async () => {
    const created = await createTheme(organizationId, actorId, baseInput({ name: "Rollback Target v1" }));
    if (!created.success) throw new Error("setup failed");
    await publishTheme(organizationId, created.themeKey, actorId);
    await saveThemeDraft(organizationId, created.themeKey, actorId, baseInput({ name: "Rollback Target v2 (bad edit)" }));
    await publishTheme(organizationId, created.themeKey, actorId);

    const rollback = await rollbackTheme(organizationId, created.themeKey, 1, actorId);
    expect(rollback.success).toBe(true);

    const history = await getThemeVersionHistory(organizationId, created.themeKey);
    expect(history).toHaveLength(3);
    const latest = await getThemeByKey(organizationId, created.themeKey);
    expect(latest?.version).toBe(3);
    expect(latest?.name).toBe("Rollback Target v1");
    expect(latest?.status).toBe("PUBLISHED");
    expect(latest?.changeSummary).toContain("Rolled back to version 1");
  });

  it("duplicateTheme mints an independent themeKey, never touching the source", async () => {
    const source = await createTheme(organizationId, actorId, baseInput({ name: "Duplicate Source" }));
    if (!source.success) throw new Error("setup failed");

    const dup = await duplicateTheme(organizationId, source.themeKey, actorId);
    expect(dup.success).toBe(true);
    if (!dup.success) return;
    expect(dup.themeKey).not.toBe(source.themeKey);

    const dupTheme = await getThemeByKey(organizationId, dup.themeKey);
    expect(dupTheme?.name).toBe("Duplicate Source (Copy)");
    expect(dupTheme?.status).toBe("DRAFT");

    const sourceStillIntact = await getThemeByKey(organizationId, source.themeKey);
    expect(sourceStillIntact?.name).toBe("Duplicate Source");
  });

  it("archiveTheme unpins the theme if it was pinned live", async () => {
    const created = await createTheme(organizationId, actorId, baseInput({ name: "Archive Me" }));
    if (!created.success) throw new Error("setup failed");
    await publishTheme(organizationId, created.themeKey, actorId);
    await setThemePinnedLive(organizationId, created.themeKey, true);

    await archiveTheme(organizationId, created.themeKey);

    const latest = await getThemeByKey(organizationId, created.themeKey);
    expect(latest?.status).toBe("ARCHIVED");
    expect(latest?.isPinnedLive).toBe(false);
  });

  it("setThemePinnedLive enforces 'only one theme pinned at a time' across the organization", async () => {
    const themeA = await createTheme(organizationId, actorId, baseInput({ name: "Pin A" }));
    const themeB = await createTheme(organizationId, actorId, baseInput({ name: "Pin B" }));
    if (!themeA.success || !themeB.success) throw new Error("setup failed");
    await publishTheme(organizationId, themeA.themeKey, actorId);
    await publishTheme(organizationId, themeB.themeKey, actorId);

    await setThemePinnedLive(organizationId, themeA.themeKey, true);
    await setThemePinnedLive(organizationId, themeB.themeKey, true);

    const latestA = await getThemeByKey(organizationId, themeA.themeKey);
    const latestB = await getThemeByKey(organizationId, themeB.themeKey);
    expect(latestA?.isPinnedLive).toBe(false);
    expect(latestB?.isPinnedLive).toBe(true);
  });

  it("setThemePinnedLive rejects pinning a DRAFT theme", async () => {
    const created = await createTheme(organizationId, actorId, baseInput({ name: "Still Draft" }));
    if (!created.success) throw new Error("setup failed");

    const result = await setThemePinnedLive(organizationId, created.themeKey, true);
    expect(result.success).toBe(false);
  });

  it("round-trips the new theming fields through create, duplicate, and rollback", async () => {
    const input = baseInput({
      name: "Field Round Trip",
      logoVariant: "LIGHT",
      primaryColor: "#111111",
      secondaryColor: "#222222",
      buttonStyle: "GRADIENT",
      buttonTextColor: "#ffffff",
      themeColors: [{ name: "Test Red", hex: "#ff0000" }],
      decorativeElements: ["SNOWFALL", "GOLD_GLOW"],
      showQrRegistration: true,
      featuredEventTitle: "Round Trip Mixer",
      featuredEventTags: ["Tag A", "Tag B"],
      promoBannerText: "Banner text",
      promoBannerLink: "https://example.com",
    });
    const created = await createTheme(organizationId, actorId, input);
    if (!created.success) throw new Error("setup failed");

    const v1 = await getThemeByKey(organizationId, created.themeKey);
    expect(v1?.logoVariant).toBe("LIGHT");
    expect(v1?.buttonStyle).toBe("GRADIENT");
    expect(v1?.decorativeElements).toEqual(["SNOWFALL", "GOLD_GLOW"]);
    expect(v1?.featuredEventTags).toEqual(["Tag A", "Tag B"]);
    expect(v1?.showQrRegistration).toBe(true);
    expect(v1?.promoBannerText).toBe("Banner text");

    await publishTheme(organizationId, created.themeKey, actorId);
    const dup = await duplicateTheme(organizationId, created.themeKey, actorId);
    if (!dup.success) throw new Error("duplicate failed");
    const dupTheme = await getThemeByKey(organizationId, dup.themeKey);
    expect(dupTheme?.decorativeElements).toEqual(["SNOWFALL", "GOLD_GLOW"]);
    expect(dupTheme?.featuredEventTitle).toBe("Round Trip Mixer");

    await saveThemeDraft(organizationId, created.themeKey, actorId, baseInput({ ...input, name: "Field Round Trip v2", decorativeElements: [] }));
    await publishTheme(organizationId, created.themeKey, actorId);
    const rolledBack = await rollbackTheme(organizationId, created.themeKey, 1, actorId);
    expect(rolledBack.success).toBe(true);
    const afterRollback = await getThemeByKey(organizationId, created.themeKey);
    expect(afterRollback?.decorativeElements).toEqual(["SNOWFALL", "GOLD_GLOW"]);
    expect(afterRollback?.promoBannerLink).toBe("https://example.com");
  });

  it("deleteTheme blocks deleting the default theme", async () => {
    const created = await createTheme(organizationId, actorId, baseInput({ name: "Default Candidate" }));
    if (!created.success) throw new Error("setup failed");
    await publishTheme(organizationId, created.themeKey, actorId);
    await setThemeDefault(organizationId, created.themeKey);

    const result = await deleteTheme(organizationId, created.themeKey);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/default/i);

    // clean up the default flag so it doesn't affect resolution elsewhere
    await prisma.kioskTheme.updateMany({ where: { organizationId, themeKey: created.themeKey }, data: { isDefault: false } });
  });

  it("deleteTheme blocks deleting a pinned-live theme", async () => {
    const created = await createTheme(organizationId, actorId, baseInput({ name: "Pinned Candidate" }));
    if (!created.success) throw new Error("setup failed");
    await publishTheme(organizationId, created.themeKey, actorId);
    await setThemePinnedLive(organizationId, created.themeKey, true);

    const result = await deleteTheme(organizationId, created.themeKey);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/pinned/i);
  });

  it("deleteTheme hard-deletes every version once unblocked", async () => {
    const created = await createTheme(organizationId, actorId, baseInput({ name: "Delete Me" }));
    if (!created.success) throw new Error("setup failed");
    await publishTheme(organizationId, created.themeKey, actorId);
    await saveThemeDraft(organizationId, created.themeKey, actorId, baseInput({ name: "Delete Me v2" }));

    const result = await deleteTheme(organizationId, created.themeKey);
    expect(result.success).toBe(true);

    const history = await getThemeVersionHistory(organizationId, created.themeKey);
    expect(history).toHaveLength(0);
  });
});

describe("Kiosk Theme presets + active-theme resolution (integration, real Postgres)", () => {
  const presetRunId = `${runId}-presets`;
  let presetOrgId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Kiosk Presets ${presetRunId}`, slug: `test-org-kiosk-presets-${presetRunId}` },
    });
    presetOrgId = org.id;
  });

  afterAll(async () => {
    await prisma.kioskInteractionEvent.deleteMany({ where: { organizationId: presetOrgId } });
    await prisma.kioskTheme.deleteMany({ where: { organizationId: presetOrgId } });
    await prisma.organization.deleteMany({ where: { id: presetOrgId } });
  });

  it("seeds exactly the three named presets, idempotently", async () => {
    await ensureDefaultThemePresets(presetOrgId);
    const firstPass = await listThemes(presetOrgId);
    const names = firstPass.map((t) => t.name).sort();
    expect(names).toEqual(["Christmas", "Halloween", "Whiskey Wednesday"]);

    // Calling again must not duplicate rows.
    await ensureDefaultThemePresets(presetOrgId);
    const secondPass = await listThemes(presetOrgId);
    expect(secondPass).toHaveLength(3);
  });

  it("the Whiskey Wednesday preset resolves as active only on its recurring weekly window", async () => {
    // Mirrors resolvePresetSchedule's own "next Wednesday from now" so this test stays correct
    // regardless of what day it actually runs on.
    const today = new Date();
    const daysUntilWednesday = (3 - today.getDay() + 7) % 7;
    const nextWednesday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilWednesday);
    const dayAfter = new Date(nextWednesday.getFullYear(), nextWednesday.getMonth(), nextWednesday.getDate() + 1);

    const wednesdayEvening = new Date(nextWednesday);
    wednesdayEvening.setHours(19, 0, 0, 0);
    const wednesdayMorning = new Date(nextWednesday);
    wednesdayMorning.setHours(9, 0, 0, 0);
    const dayAfterEvening = new Date(dayAfter);
    dayAfterEvening.setHours(19, 0, 0, 0);

    const active = await resolveActiveTheme(presetOrgId, wednesdayEvening);
    expect(active?.name).toBe("Whiskey Wednesday");

    const outsideTime = await resolveActiveTheme(presetOrgId, wednesdayMorning);
    expect(outsideTime).toBeNull();

    const outsideDay = await resolveActiveTheme(presetOrgId, dayAfterEvening);
    expect(outsideDay).toBeNull();
  });
});
