"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarPlus, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPACE_TYPE_META, SPACE_CATEGORY_META } from "@/features/spaces/components/space-card";
import { SpaceStatusBadge } from "@/features/spaces/components/space-status-badge";
import { getSpaceCategory } from "@/lib/utils/space-category";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SpaceDashboardItem } from "@/features/spaces/services/spaces.service";

export function SpaceOverviewCard({
  space,
  onQuickBook,
  isFavorite,
  onToggleFavorite,
}: {
  space: SpaceDashboardItem;
  onQuickBook: (id: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const router = useRouter();
  const meta = SPACE_TYPE_META[space.type];
  const Icon = meta.icon;
  const category = getSpaceCategory(space.type);
  const categoryMeta = SPACE_CATEGORY_META[category];

  const currentBookingLabel =
    space.status === "OCCUPIED" && space.activeSession
      ? `${space.activeSession.memberName}${space.activeSession.projectName ? ` · ${space.activeSession.projectName}` : ""}`
      : space.status === "RESERVED" && space.currentReservation
        ? `${space.currentReservation.memberName} · until ${format(space.currentReservation.endTime, "h:mm a")}`
        : null;

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/spaces/${space.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/spaces/${space.id}`);
        }
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm outline-none transition-shadow hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-ring sm:gap-3.5 sm:p-5"
    >
      <div className={cn("relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border", !space.imageUrl && categoryMeta.accent)}>
        {space.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={space.imageUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <Icon className="size-10 opacity-80 sm:size-12" />
        )}
        <button
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorite}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(space.id);
          }}
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
        >
          <Heart className={cn("size-3.5", isFavorite && "fill-destructive text-destructive")} />
        </button>
        <div className="absolute top-2 left-2">
          <SpaceStatusBadge status={space.status} />
        </div>
      </div>

      <div className="min-w-0 w-full">
        <p className="truncate text-sm font-semibold sm:text-base">{space.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
            {meta.label}
          </Badge>
          {space.capacity && <span className="text-xs text-muted-foreground">Seats {space.capacity}</span>}
        </div>
      </div>

      <div className="h-7 w-full sm:h-8">
        {currentBookingLabel ? (
          <p className="truncate text-xs text-muted-foreground">{currentBookingLabel}</p>
        ) : space.nextReservation ? (
          <p className="truncate text-xs text-muted-foreground">
            Next: {format(space.nextReservation.startTime, "MMM d, h:mm a")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/60">No bookings today</p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={(e) => {
          e.stopPropagation();
          onQuickBook(space.id);
        }}
      >
        <CalendarPlus className="size-3.5" /> Book
      </Button>
    </motion.div>
  );
}
