"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { resolveQRToken } from "@/features/qr/services/qr-asset.service";
import { checkInMemberToEvent, type EventCheckInResult } from "@/features/events/services/event-checkin.service";
import { recordKioskInteraction } from "@/features/kiosk/services/kiosk-analytics.service";

export type SelfEventCheckInResult = EventCheckInResult | { outcome: "not_signed_in" } | { outcome: "wrong_type" };

/** Powers /scan/[token] when the scanned badge is an Event's own QR poster — self-service, requires a signed-in member. */
export async function checkInSelfToEventByToken(token: string): Promise<SelfEventCheckInResult> {
  const asset = await resolveQRToken(token);
  if (!asset || asset.type !== "EVENT" || !asset.event) return { outcome: "wrong_type" };

  let actor;
  try {
    actor = await requireCurrentMember();
  } catch {
    return { outcome: "not_signed_in" };
  }
  if (actor.organizationId !== asset.event.organizationId) return { outcome: "not_found" };

  const result = await checkInMemberToEvent(asset.event.id, actor.id, "QR");
  if (result.outcome === "checked_in") {
    await recordKioskInteraction(actor.organizationId, "CHECK_IN", { metadata: { eventId: asset.event.id } });
    revalidatePath(`/events/${asset.event.id}`);
  }
  return result;
}

/** Admin manual check-in from the Event Dashboard's attendee list. */
export async function adminCheckInMemberToEvent(eventId: string, memberId: string): Promise<EventCheckInResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "events.manage")) return { outcome: "not_found" };

  const result = await checkInMemberToEvent(eventId, memberId, "MANUAL", actor.id);
  if (result.outcome === "checked_in") revalidatePath(`/events/${eventId}`);
  return result;
}
