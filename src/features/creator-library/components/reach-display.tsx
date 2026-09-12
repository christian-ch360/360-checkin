import { Camera, Clapperboard, Music2 } from "lucide-react";
import type { SocialPlatform } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS } from "@/features/creator-library/config/library-config";
import { formatAudience, type AudienceBreakdown } from "@/features/creator-library/lib/audience";

const PLATFORM_ICON: Record<SocialPlatform, typeof Camera> = {
  INSTAGRAM: Camera,
  TIKTOK: Music2,
  YOUTUBE: Clapperboard,
};

// Fixed platform order so cards line up in the grid regardless of which
// platforms a given creator has.
const ORDER: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE"];

/**
 * The per-platform reach breakdown + a TOTAL REACH row — the lower half of a
 * creator card. Numbers come from the already-computed AudienceBreakdown;
 * nothing is invented (empty platforms are simply omitted, and a creator
 * with no data shows "Reach data unavailable"). A thin gold rule sets the
 * Total Reach row apart as the headline number.
 */
export function ReachDisplay({ audience, className }: { audience: AudienceBreakdown; className?: string }) {
  if (audience.isEmpty) {
    return <p className={cn("text-xs text-[#6B6B6B]", className)}>Reach data unavailable</p>;
  }

  const byPlatform = new Map(audience.platforms.map((entry) => [entry.platform, entry.count]));

  return (
    <div className={cn("space-y-1.5", className)}>
      {ORDER.filter((platform) => byPlatform.has(platform)).map((platform) => {
        const Icon = PLATFORM_ICON[platform];
        return (
          <div key={platform} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-[#6B6B6B]">
              <Icon className="size-3.5" />
              {PLATFORM_LABELS[platform]}
            </span>
            <span className="font-medium tabular-nums text-[#161616]">{formatAudience(byPlatform.get(platform) as number)}</span>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-3 border-t-2 border-[#E8D5A3] pt-2">
        <span className="text-[0.65rem] font-semibold tracking-[0.16em] text-[#6B6B6B] uppercase">
          Total Reach
        </span>
        <span className="text-base font-semibold tabular-nums text-[#161616]">{formatAudience(audience.total)}</span>
      </div>
    </div>
  );
}
