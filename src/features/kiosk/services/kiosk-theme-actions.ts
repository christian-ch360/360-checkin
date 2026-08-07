"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { uploadKioskBackgroundImage } from "@/lib/supabase/storage";
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

const ALLOWED_BACKGROUND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BACKGROUND_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type UploadThemeImageResult = { success: true; url: string } | { success: false; error: string };

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

/**
 * Uploads a theme background image to Storage and returns its public URL —
 * it does NOT write to the theme record. The editor holds `backgroundImageUrl`
 * in client form state like every other field, and only persists it when the
 * admin clicks Save Draft/Publish, exactly like typing a URL by hand did before.
 */
export async function uploadThemeBackgroundImageAction(
  themeKey: string | undefined,
  formData: FormData
): Promise<UploadThemeImageResult> {
  const actor = await requireKioskManager();

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file was uploaded." };
  if (!ALLOWED_BACKGROUND_IMAGE_TYPES.includes(file.type)) {
    return { success: false, error: "Images must be JPG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
    return { success: false, error: "That image is larger than 10MB." };
  }

  try {
    const ext = EXTENSION_BY_MIME[file.type] ?? "jpg";
    const path = `${actor.organizationId}/${themeKey ?? "drafts"}/${crypto.randomUUID()}.${ext}`;
    const url = await uploadKioskBackgroundImage(path, file);
    return { success: true, url };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Upload failed. Please try again." };
  }
}
