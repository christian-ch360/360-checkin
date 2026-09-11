import { Camera, Clapperboard, Music2 } from "lucide-react";
import type { SocialPlatform } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS } from "@/features/creator-library/config/library-config";

// Icons chosen to match the app's existing SOCIAL_META mapping so a creator's
// platform reads the same here as in the dashboard.
const PLATFORM_ICON: Record<SocialPlatform, typeof Camera> = {
  INSTAGRAM: Camera,
  TIKTOK: Music2,
  YOUTUBE: Clapperboard,
};

export function PlatformBadges({
  platforms,
  className,
  tone = "overlay",
}: {
  platforms: SocialPlatform[];
  className?: string;
  tone?: "overlay" | "solid";
}) {
  if (platforms.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {platforms.map((platform) => {
        const Icon = PLATFORM_ICON[platform];
        return (
          <span
            key={platform}
            title={PLATFORM_LABELS[platform]}
            className={cn(
              "flex size-7 items-center justify-center rounded-full",
              tone === "overlay"
                ? "bg-black/40 text-white backdrop-blur-sm"
                : "border border-border bg-background text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span className="sr-only">{PLATFORM_LABELS[platform]}</span>
          </span>
        );
      })}
    </div>
  );
}
