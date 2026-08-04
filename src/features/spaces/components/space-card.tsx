import {
  Mic,
  Scissors,
  Camera,
  Users2,
  Presentation,
  Sofa,
  Sparkles,
  Disc3,
  Radio,
  FlaskConical,
  PartyPopper,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { SpaceType } from "@prisma/client";
import type { SpaceCategory } from "@/lib/utils/space-category";

export const SPACE_TYPE_META: Record<SpaceType, { label: string; icon: LucideIcon }> = {
  PODCAST_BOOTH: { label: "Podcast Booth", icon: Mic },
  EDITING_SUITE: { label: "Editing Suite", icon: Scissors },
  PHOTOGRAPHY_STUDIO: { label: "Photography Studio", icon: Camera },
  CONFERENCE_ROOM: { label: "Conference Room", icon: Presentation },
  MEETING_ROOM: { label: "Meeting Room", icon: Users2 },
  CREATOR_LOUNGE: { label: "Creator Lounge", icon: Sofa },
  BEAUTY_STATION: { label: "Makeup", icon: Sparkles },
  RECORDING_STUDIO: { label: "Recording Studio", icon: Disc3 },
  LIVESTREAM_STUDIO: { label: "Livestream Studio", icon: Radio },
  CONTENT_LAB: { label: "Content Lab", icon: FlaskConical },
  EVENT_SPACE: { label: "Event Space", icon: PartyPopper },
  CONTENT_BOOTH: { label: "Content Booth", icon: Video },
};

/** One icon + accent color per browsing category, used for pills and card cover art. */
export const SPACE_CATEGORY_META: Record<SpaceCategory, { icon: LucideIcon; accent: string }> = {
  beauty: {
    icon: Sparkles,
    accent: "text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20",
  },
  booths: {
    icon: Video,
    accent: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  studios: {
    icon: Disc3,
    accent: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
  podcast: {
    icon: Mic,
    accent: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  meeting: {
    icon: Presentation,
    accent: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
};
