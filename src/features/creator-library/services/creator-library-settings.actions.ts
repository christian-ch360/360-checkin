"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { uploadCreatorLibraryImage } from "@/lib/supabase/storage";
import { patchLibrarySettings, type CreatorLibrarySettings } from "@/features/creator-library/lib/library-settings";

export type LibrarySettingsResult =
  | { success: true; settings: CreatorLibrarySettings }
  | { success: false; error: string };

const HERO_MAX_BYTES = 8 * 1024 * 1024;
const HERO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ICON_MAX_BYTES = 2 * 1024 * 1024;
const ICON_MIME_TYPES = ["image/png", "image/svg+xml"];

async function requireLibraryManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    throw new Error("You don't have permission to manage the Creator Library.");
  }
  return actor;
}

function revalidateSettings() {
  revalidatePath("/creator-library");
  revalidatePath("/admin/creator-library");
  revalidatePath("/admin/creator-library/settings");
}

/** Ops uploads a new full-bleed hero banner image for the public Creator Network home. */
export async function uploadLibraryHeroImage(formData: FormData): Promise<LibrarySettingsResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file was uploaded." };
  if (!HERO_MIME_TYPES.includes(file.type)) return { success: false, error: "Images must be JPEG, PNG, or WebP." };
  if (file.size > HERO_MAX_BYTES) return { success: false, error: "Image is larger than 8MB." };

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${actor.organizationId}/settings/hero-${crypto.randomUUID()}.${extension}`;

  try {
    const heroImageUrl = await uploadCreatorLibraryImage(path, file);
    const settings = await patchLibrarySettings(actor.organizationId, { heroImageUrl });
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "creator_library.hero_image_updated",
      entityType: "Organization",
      entityId: actor.organizationId,
    });
    revalidateSettings();
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Upload failed. Please try again." };
  }
}

export async function removeLibraryHeroImage(): Promise<LibrarySettingsResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }
  const settings = await patchLibrarySettings(actor.organizationId, { heroImageUrl: null });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "creator_library.hero_image_removed",
    entityType: "Organization",
    entityId: actor.organizationId,
  });
  revalidateSettings();
  return { success: true, settings };
}

/** How dark the scrim over the hero image reads — kept as a plain 0–1 slider value. */
export async function setLibraryHeroOverlay(opacity: number): Promise<LibrarySettingsResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }
  const clamped = Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 0.55;
  const settings = await patchLibrarySettings(actor.organizationId, { heroOverlayOpacity: clamped });
  revalidateSettings();
  return { success: true, settings };
}

/** Ops uploads the global fallback icon shown on any creator card with no photo. */
export async function uploadLibraryPlaceholderIcon(formData: FormData): Promise<LibrarySettingsResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file was uploaded." };
  if (!ICON_MIME_TYPES.includes(file.type)) return { success: false, error: "Icons must be PNG or SVG." };
  if (file.size > ICON_MAX_BYTES) return { success: false, error: "Icon is larger than 2MB." };

  const extension = file.type === "image/svg+xml" ? "svg" : "png";
  const path = `${actor.organizationId}/settings/placeholder-icon-${crypto.randomUUID()}.${extension}`;

  try {
    const placeholderIconUrl = await uploadCreatorLibraryImage(path, file);
    const settings = await patchLibrarySettings(actor.organizationId, { placeholderIconUrl });
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "creator_library.placeholder_icon_updated",
      entityType: "Organization",
      entityId: actor.organizationId,
    });
    revalidateSettings();
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Upload failed. Please try again." };
  }
}

export async function removeLibraryPlaceholderIcon(): Promise<LibrarySettingsResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }
  const settings = await patchLibrarySettings(actor.organizationId, { placeholderIconUrl: null });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "creator_library.placeholder_icon_removed",
    entityType: "Organization",
    entityId: actor.organizationId,
  });
  revalidateSettings();
  return { success: true, settings };
}
