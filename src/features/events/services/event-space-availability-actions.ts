"use server";

import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getSpaceAvailability, type SpaceAvailabilitySummary } from "@/features/events/services/event-space-availability.service";

export async function checkEventSpaceAvailability(
  spaceId: string,
  startTime: string,
  endTime: string
): Promise<SpaceAvailabilitySummary | null> {
  const actor = await requireCurrentMember();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return getSpaceAvailability(actor.organizationId, spaceId, start, end);
}
