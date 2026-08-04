import "server-only";

import type { SpaceType } from "@prisma/client";
import { hasFeatureAccess } from "@/features/membership-plans/services/membership-usage.service";

/**
 * Space types tied to a specific membership benefit key — reservable only
 * by members whose package includes that feature (per spec: "Board room
 * reservations, Podcast room reservations, Lounge access"). Space types
 * absent here (editing suite, meeting room, etc.) are open to any member
 * with an active membership, unrestricted by package tier.
 */
const GATED_SPACE_FEATURE_KEY: Partial<Record<SpaceType, string>> = {
  CONFERENCE_ROOM: "board_room_access",
  PODCAST_BOOTH: "podcast_room_access",
  CREATOR_LOUNGE: "lounge_access",
};

export async function requireSpaceTypeAccess(
  memberId: string,
  spaceType: SpaceType
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const featureKey = GATED_SPACE_FEATURE_KEY[spaceType];
  if (!featureKey) return { allowed: true };

  const allowed = await hasFeatureAccess(memberId, featureKey);
  if (allowed) return { allowed: true };
  return {
    allowed: false,
    reason: "Your membership package doesn't include access to this space. Upgrade your package to book it.",
  };
}
