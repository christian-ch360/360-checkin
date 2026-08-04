"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import {
  reorderSections,
  setSectionEnabled,
  addCustomSection,
  removeCustomSection,
  type KioskSectionActionResult,
} from "@/features/kiosk/services/kiosk-sections.service";

async function requireKioskManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "kiosk.manage")) {
    throw new Error("Only Super Admins can change the kiosk homepage layout.");
  }
  return actor;
}

function revalidateKioskSurfaces() {
  revalidatePath("/admin/kiosk-manager");
  revalidatePath("/kiosk");
}

export async function reorderSectionsAction(orderedKeys: string[]): Promise<KioskSectionActionResult> {
  const actor = await requireKioskManager();
  const result = await reorderSections(actor.organizationId, orderedKeys, actor.id);
  if (result.success) {
    await logAudit({ organizationId: actor.organizationId, actorId: actor.id, action: "kiosk.sections_reordered", entityType: "kiosk_section_config", entityId: actor.organizationId, after: { orderedKeys } });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function setSectionEnabledAction(key: string, enabled: boolean): Promise<KioskSectionActionResult> {
  const actor = await requireKioskManager();
  const result = await setSectionEnabled(actor.organizationId, key, enabled, actor.id);
  if (result.success) {
    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: enabled ? "kiosk.section_enabled" : "kiosk.section_disabled",
      entityType: "kiosk_section_config",
      entityId: key,
    });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function addCustomSectionAction(label: string): Promise<KioskSectionActionResult> {
  const actor = await requireKioskManager();
  const result = await addCustomSection(actor.organizationId, label, actor.id);
  if (result.success) {
    await logAudit({ organizationId: actor.organizationId, actorId: actor.id, action: "kiosk.custom_section_added", entityType: "kiosk_section_config", entityId: actor.organizationId, after: { label } });
    revalidateKioskSurfaces();
  }
  return result;
}

export async function removeCustomSectionAction(key: string): Promise<KioskSectionActionResult> {
  const actor = await requireKioskManager();
  const result = await removeCustomSection(actor.organizationId, key);
  if (result.success) {
    await logAudit({ organizationId: actor.organizationId, actorId: actor.id, action: "kiosk.custom_section_removed", entityType: "kiosk_section_config", entityId: key });
    revalidateKioskSurfaces();
  }
  return result;
}
