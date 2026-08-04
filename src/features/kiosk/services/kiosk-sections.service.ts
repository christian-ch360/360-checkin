import "server-only";

import { randomUUID } from "node:crypto";
import type { KioskSectionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Default homepage layout for a brand-new organization — matches the spec's listed
 * order exactly. CUSTOM sections are never part of the default set; admins add them explicitly. */
const DEFAULT_SECTIONS: { sectionType: KioskSectionType; label: string }[] = [
  { sectionType: "HERO", label: "Hero Banner" },
  { sectionType: "WELCOME_MESSAGE", label: "Welcome Message" },
  { sectionType: "EVENT_BANNER", label: "Event Banner" },
  { sectionType: "ANNOUNCEMENTS", label: "Announcements" },
  { sectionType: "SPONSORS", label: "Sponsor Section" },
  { sectionType: "FEATURED_CREATOR", label: "Featured Creator" },
  { sectionType: "FEATURED_BRAND", label: "Featured Brand" },
  { sectionType: "HIGHLIGHTS", label: "Today's Highlights" },
  { sectionType: "QR_CHECKIN", label: "QR Check-In" },
  { sectionType: "REGISTER_NOW", label: "Register Now" },
];

/** "Homepage Builder" — self-healing: seeds the default layout the first time an
 * organization's sections are read, same convention as ensureQRAsset/ensureReferralCode. */
export async function getHomepageSections(organizationId: string) {
  const existing = await prisma.kioskSectionConfig.findMany({
    where: { organizationId },
    orderBy: { order: "asc" },
  });
  if (existing.length > 0) return existing;

  await prisma.kioskSectionConfig.createMany({
    data: DEFAULT_SECTIONS.map((s, index) => ({
      organizationId,
      sectionType: s.sectionType,
      key: s.sectionType,
      label: s.label,
      order: index,
      enabled: true,
    })),
  });
  return prisma.kioskSectionConfig.findMany({ where: { organizationId }, orderBy: { order: "asc" } });
}

export type KioskSectionActionResult = { success: true } | { success: false; error: string };

/** "Drag-and-drop ordering" — `orderedKeys` is the full new top-to-bottom order; every key must
 * belong to this organization or the whole reorder is rejected (no partial application). */
export async function reorderSections(organizationId: string, orderedKeys: string[], actorId: string): Promise<KioskSectionActionResult> {
  const rows = await prisma.kioskSectionConfig.findMany({ where: { organizationId, key: { in: orderedKeys } } });
  if (rows.length !== orderedKeys.length) return { success: false, error: "One or more sections were not found." };

  await prisma.$transaction(
    orderedKeys.map((key, index) =>
      prisma.kioskSectionConfig.update({ where: { organizationId_key: { organizationId, key } }, data: { order: index, updatedById: actorId } })
    )
  );
  return { success: true };
}

export async function setSectionEnabled(organizationId: string, key: string, enabled: boolean, actorId: string): Promise<KioskSectionActionResult> {
  const existing = await prisma.kioskSectionConfig.findUnique({ where: { organizationId_key: { organizationId, key } } });
  if (!existing) return { success: false, error: "Section not found." };
  await prisma.kioskSectionConfig.update({ where: { organizationId_key: { organizationId, key } }, data: { enabled, updatedById: actorId } });
  return { success: true };
}

export async function addCustomSection(organizationId: string, label: string, actorId: string): Promise<KioskSectionActionResult> {
  const trimmed = label.trim();
  if (!trimmed) return { success: false, error: "Enter a section name." };

  const maxOrder = await prisma.kioskSectionConfig.aggregate({ where: { organizationId }, _max: { order: true } });
  await prisma.kioskSectionConfig.create({
    data: {
      organizationId,
      sectionType: "CUSTOM",
      key: `custom-${randomUUID()}`,
      label: trimmed,
      order: (maxOrder._max.order ?? -1) + 1,
      enabled: true,
      updatedById: actorId,
    },
  });
  return { success: true };
}

export async function removeCustomSection(organizationId: string, key: string): Promise<KioskSectionActionResult> {
  const existing = await prisma.kioskSectionConfig.findUnique({ where: { organizationId_key: { organizationId, key } } });
  if (!existing) return { success: false, error: "Section not found." };
  if (existing.sectionType !== "CUSTOM") return { success: false, error: "Only custom sections can be removed — disable built-in sections instead." };
  await prisma.kioskSectionConfig.delete({ where: { organizationId_key: { organizationId, key } } });
  return { success: true };
}
