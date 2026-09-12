import "server-only";

import { prisma } from "@/lib/db/prisma";

/**
 * Org-level Creator Library settings (hero banner image + overlay strength,
 * and the global "Card Placeholder Icon" shown on creators with no photo).
 * Stored in the existing generic `Organization.settings` JSON column under
 * the `creatorLibrary` key — no schema migration needed, same pattern
 * Prisma already reserves that column for.
 */
export type CreatorLibrarySettings = {
  heroImageUrl: string | null;
  /** 0–1. How dark the scrim over the hero image is, for text legibility. */
  heroOverlayOpacity: number;
  placeholderIconUrl: string | null;
};

export const DEFAULT_LIBRARY_SETTINGS: CreatorLibrarySettings = {
  heroImageUrl: null,
  heroOverlayOpacity: 0.55,
  placeholderIconUrl: null,
};

function readSettings(raw: unknown): CreatorLibrarySettings {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cl = obj.creatorLibrary && typeof obj.creatorLibrary === "object" ? (obj.creatorLibrary as Record<string, unknown>) : {};

  const heroImageUrl = typeof cl.heroImageUrl === "string" ? cl.heroImageUrl : null;
  const placeholderIconUrl = typeof cl.placeholderIconUrl === "string" ? cl.placeholderIconUrl : null;
  const rawOverlay = typeof cl.heroOverlayOpacity === "number" ? cl.heroOverlayOpacity : DEFAULT_LIBRARY_SETTINGS.heroOverlayOpacity;
  const heroOverlayOpacity = Number.isFinite(rawOverlay) ? Math.min(1, Math.max(0, rawOverlay)) : DEFAULT_LIBRARY_SETTINGS.heroOverlayOpacity;

  return { heroImageUrl, heroOverlayOpacity, placeholderIconUrl };
}

export async function getLibrarySettings(organizationId: string): Promise<CreatorLibrarySettings> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { settings: true } });
  if (!org) return DEFAULT_LIBRARY_SETTINGS;
  return readSettings(org.settings);
}

/** Merges a partial patch into the org's `settings.creatorLibrary` without clobbering other keys already in `settings`. */
export async function patchLibrarySettings(
  organizationId: string,
  patch: Partial<CreatorLibrarySettings>,
): Promise<CreatorLibrarySettings> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { settings: true } });
  const existingRaw = org?.settings && typeof org.settings === "object" ? (org.settings as Record<string, unknown>) : {};
  const current = readSettings(org?.settings);
  const next: CreatorLibrarySettings = { ...current, ...patch };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: { ...existingRaw, creatorLibrary: next } },
  });

  return next;
}
