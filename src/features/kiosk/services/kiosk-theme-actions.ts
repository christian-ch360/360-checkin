"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
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
  type KioskThemeInput,
  type KioskThemeActionResult,
} from "@/features/kiosk/services/kiosk-theme.service";

/** "Only Super Admins may: Create themes, Edit themes, Publish themes, Delete themes, ...
 * Schedule themes." Every mutating action in this file starts with the same check. */
async function requireKioskManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "kiosk.manage")) {
    throw new Error("Only Super Admins can manage the kiosk experience.");
  }
  return actor;
}

function revalidateKioskSurfaces() {
  revalidatePath("/admin/kiosk-manager");
  revalidatePath("/kiosk");
}

export async function createThemeAction(input: KioskThemeInput): Promise<KioskThemeActionResult> {
  const actor = await requireKioskManager();
  const result = await createTheme(actor.organizationId, actor.id, input);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.theme_created",
      entityType: "kiosk_theme",
      entityId: result.themeKey,
      after: { name: input.name },
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function saveThemeDraftAction(themeKey: string, input: KioskThemeInput): Promise<KioskThemeActionResult> {
  const actor = await requireKioskManager();
  const result = await saveThemeDraft(actor.organizationId, themeKey, actor.id, input);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.theme_draft_saved",
      entityType: "kiosk_theme",
      entityId: themeKey,
      after: { name: input.name },
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function publishThemeAction(themeKey: string): Promise<KioskThemeActionResult> {
  const actor = await requireKioskManager();
  const result = await publishTheme(actor.organizationId, themeKey, actor.id);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.theme_published",
      entityType: "kiosk_theme",
      entityId: themeKey,
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function archiveThemeAction(themeKey: string): Promise<KioskThemeActionResult> {
  const actor = await requireKioskManager();
  const result = await archiveTheme(actor.organizationId, themeKey);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.theme_archived",
      entityType: "kiosk_theme",
      entityId: themeKey,
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function duplicateThemeAction(sourceThemeKey: string): Promise<KioskThemeActionResult> {
  const actor = await requireKioskManager();
  const result = await duplicateTheme(actor.organizationId, sourceThemeKey, actor.id);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.theme_duplicated",
      entityType: "kiosk_theme",
      entityId: result.themeKey,
      before: { sourceThemeKey },
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function rollbackThemeAction(themeKey: string, targetVersion: number): Promise<KioskThemeActionResult> {
  const actor = await requireKioskManager();
  const result = await rollbackTheme(actor.organizationId, themeKey, targetVersion, actor.id);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.theme_rolled_back",
      entityType: "kiosk_theme",
      entityId: themeKey,
      after: { targetVersion },
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function setThemePinnedLiveAction(themeKey: string, pinned: boolean): Promise<KioskThemeActionResult> {
  const actor = await requireKioskManager();
  const result = await setThemePinnedLive(actor.organizationId, themeKey, pinned);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: pinned ? "kiosk.theme_pinned_live" : "kiosk.theme_unpinned",
      entityType: "kiosk_theme",
      entityId: themeKey,
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function deleteThemeAction(themeKey: string): Promise<KioskThemeActionResult> {
  const actor = await requireKioskManager();
  const result = await deleteTheme(actor.organizationId, themeKey);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.theme_deleted",
      entityType: "kiosk_theme",
      entityId: themeKey,
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function setThemeDefaultAction(themeKey: string): Promise<KioskThemeActionResult> {
  const actor = await requireKioskManager();
  const result = await setThemeDefault(actor.organizationId, themeKey);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.theme_set_default",
      entityType: "kiosk_theme",
      entityId: themeKey,
    });
    revalidateKioskSurfaces();
  }
  return result;
}
