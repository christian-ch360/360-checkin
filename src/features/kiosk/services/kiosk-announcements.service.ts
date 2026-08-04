import "server-only";

import { prisma } from "@/lib/db/prisma";

export type KioskAnnouncementInput = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaLink?: string | null;
  priority?: number;
  isPinned?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
};

export type KioskAnnouncementActionResult = { success: true; id: string } | { success: false; error: string };

export async function listAnnouncements(organizationId: string) {
  return prisma.kioskAnnouncement.findMany({
    where: { organizationId },
    orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { fullName: true } }, updatedBy: { select: { fullName: true } } },
  });
}

/** "Rotating Announcements" — the kiosk-facing set: PUBLISHED, pinned first, then by priority,
 * and only within their scheduling window if one was set (no window = always visible). */
export async function getVisibleAnnouncements(organizationId: string, now: Date = new Date()) {
  const rows = await prisma.kioskAnnouncement.findMany({
    where: {
      organizationId,
      status: "PUBLISHED",
      OR: [{ startDate: null }, { startDate: { lte: now } }],
    },
    orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
  return rows.filter((a) => !a.endDate || a.endDate >= now);
}

export async function createAnnouncement(organizationId: string, actorId: string, input: KioskAnnouncementInput): Promise<KioskAnnouncementActionResult> {
  const row = await prisma.kioskAnnouncement.create({
    data: {
      organizationId,
      status: "DRAFT",
      createdById: actorId,
      ...toWriteData(input),
    },
  });
  return { success: true, id: row.id };
}

export async function updateAnnouncement(organizationId: string, id: string, actorId: string, input: KioskAnnouncementInput): Promise<KioskAnnouncementActionResult> {
  const existing = await prisma.kioskAnnouncement.findFirst({ where: { id, organizationId } });
  if (!existing) return { success: false, error: "Announcement not found." };
  await prisma.kioskAnnouncement.update({ where: { id }, data: { updatedById: actorId, ...toWriteData(input) } });
  return { success: true, id };
}

export async function publishAnnouncement(organizationId: string, id: string): Promise<KioskAnnouncementActionResult> {
  const existing = await prisma.kioskAnnouncement.findFirst({ where: { id, organizationId } });
  if (!existing) return { success: false, error: "Announcement not found." };
  await prisma.kioskAnnouncement.update({ where: { id }, data: { status: "PUBLISHED" } });
  return { success: true, id };
}

export async function archiveAnnouncement(organizationId: string, id: string): Promise<KioskAnnouncementActionResult> {
  const existing = await prisma.kioskAnnouncement.findFirst({ where: { id, organizationId } });
  if (!existing) return { success: false, error: "Announcement not found." };
  await prisma.kioskAnnouncement.update({ where: { id }, data: { status: "ARCHIVED", isPinned: false } });
  return { success: true, id };
}

export async function setAnnouncementPinned(organizationId: string, id: string, pinned: boolean): Promise<KioskAnnouncementActionResult> {
  const existing = await prisma.kioskAnnouncement.findFirst({ where: { id, organizationId } });
  if (!existing) return { success: false, error: "Announcement not found." };
  await prisma.kioskAnnouncement.update({ where: { id }, data: { isPinned: pinned } });
  return { success: true, id };
}

export async function deleteAnnouncement(organizationId: string, id: string): Promise<KioskAnnouncementActionResult> {
  const existing = await prisma.kioskAnnouncement.findFirst({ where: { id, organizationId } });
  if (!existing) return { success: false, error: "Announcement not found." };
  await prisma.kioskAnnouncement.delete({ where: { id } });
  return { success: true, id };
}

function toWriteData(input: KioskAnnouncementInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    ctaLabel: input.ctaLabel ?? null,
    ctaLink: input.ctaLink ?? null,
    priority: input.priority ?? 0,
    isPinned: input.isPinned ?? false,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
  };
}
