"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import {
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  setAnnouncementPinned,
  deleteAnnouncement,
  type KioskAnnouncementInput,
  type KioskAnnouncementActionResult,
} from "@/features/kiosk/services/kiosk-announcements.service";

async function requireKioskManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "kiosk.manage")) {
    throw new Error("Only Super Admins can manage kiosk announcements.");
  }
  return actor;
}

function revalidateKioskSurfaces() {
  revalidatePath("/admin/kiosk-manager");
  revalidatePath("/kiosk");
}

export async function createAnnouncementAction(input: KioskAnnouncementInput): Promise<KioskAnnouncementActionResult> {
  const actor = await requireKioskManager();
  const result = await createAnnouncement(actor.organizationId, actor.id, input);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.announcement_created",
      entityType: "kiosk_announcement",
      entityId: result.id,
      after: { title: input.title },
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function updateAnnouncementAction(id: string, input: KioskAnnouncementInput): Promise<KioskAnnouncementActionResult> {
  const actor = await requireKioskManager();
  const result = await updateAnnouncement(actor.organizationId, id, actor.id, input);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "kiosk.announcement_updated",
      entityType: "kiosk_announcement",
      entityId: id,
      after: { title: input.title },
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function publishAnnouncementAction(id: string): Promise<KioskAnnouncementActionResult> {
  const actor = await requireKioskManager();
  const result = await publishAnnouncement(actor.organizationId, id);
  if (result.success) {
    await logAudit({ organizationId: actor.organizationId, actorId: actor.id, action: "kiosk.announcement_published", entityType: "kiosk_announcement", entityId: id });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function archiveAnnouncementAction(id: string): Promise<KioskAnnouncementActionResult> {
  const actor = await requireKioskManager();
  const result = await archiveAnnouncement(actor.organizationId, id);
  if (result.success) {
    await logAudit({ organizationId: actor.organizationId, actorId: actor.id, action: "kiosk.announcement_archived", entityType: "kiosk_announcement", entityId: id });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function setAnnouncementPinnedAction(id: string, pinned: boolean): Promise<KioskAnnouncementActionResult> {
  const actor = await requireKioskManager();
  const result = await setAnnouncementPinned(actor.organizationId, id, pinned);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: pinned ? "kiosk.announcement_pinned" : "kiosk.announcement_unpinned",
      entityType: "kiosk_announcement",
      entityId: id,
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function deleteAnnouncementAction(id: string): Promise<KioskAnnouncementActionResult> {
  const actor = await requireKioskManager();
  const result = await deleteAnnouncement(actor.organizationId, id);
  if (result.success) {
    await logAudit({ organizationId: actor.organizationId, actorId: actor.id, action: "kiosk.announcement_deleted", entityType: "kiosk_announcement", entityId: id });
    revalidateKioskSurfaces();
  }
  return result;
}
