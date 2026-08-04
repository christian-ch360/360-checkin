import type { SpaceType } from "@prisma/client";

export type SpaceCategory = "beauty" | "booths" | "studios" | "podcast" | "meeting";

const CATEGORY_BY_TYPE: Record<SpaceType, SpaceCategory> = {
  BEAUTY_STATION: "beauty",
  CONTENT_BOOTH: "booths",
  PODCAST_BOOTH: "podcast",
  RECORDING_STUDIO: "studios",
  PHOTOGRAPHY_STUDIO: "studios",
  LIVESTREAM_STUDIO: "studios",
  CONTENT_LAB: "studios",
  EDITING_SUITE: "studios",
  CREATOR_LOUNGE: "studios",
  EVENT_SPACE: "studios",
  MEETING_ROOM: "meeting",
  CONFERENCE_ROOM: "meeting",
};

export function getSpaceCategory(type: SpaceType): SpaceCategory {
  return CATEGORY_BY_TYPE[type];
}

export const SPACE_CATEGORY_LABELS: Record<SpaceCategory, string> = {
  beauty: "Beauty",
  booths: "Booths",
  studios: "Studios",
  podcast: "Podcast",
  meeting: "Meeting Rooms",
};

/**
 * Space has no `description` field in the schema, so these are short,
 * category-level blurbs rather than per-space copy — a deliberate
 * presentation-layer stand-in, not a substitute for real space descriptions.
 */
export const SPACE_CATEGORY_COPY: Record<SpaceCategory, string> = {
  beauty: "A styled space for hair, makeup, and on-camera touch-ups.",
  booths: "A compact, self-contained booth for quick content shoots.",
  studios: "A fully equipped studio for recording, photo, and video work.",
  podcast: "A sound-treated room built for podcast recording.",
  meeting: "A private room for meetings, calls, and planning sessions.",
};
