import { Music2, Camera, Clapperboard } from "lucide-react";

export const SOCIAL_META: Record<
  string,
  { icon: React.ReactNode; accentClass: string; description: string; metricLabel: string; label: string }
> = {
  TIKTOK: {
    icon: <Music2 className="size-5" />,
    accentClass: "bg-[#010101] text-white",
    description: "Import your profile, followers, and creator stats.",
    metricLabel: "Followers",
    label: "TikTok",
  },
  INSTAGRAM: {
    icon: <Camera className="size-5" />,
    accentClass: "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white",
    description: "Sync your profile, followers, and post insights.",
    metricLabel: "Followers",
    label: "Instagram",
  },
  YOUTUBE: {
    icon: <Clapperboard className="size-5" />,
    accentClass: "bg-[#ff0000] text-white",
    description: "Sync your channel, subscribers, and video count.",
    metricLabel: "Subscribers",
    label: "YouTube",
  },
};
