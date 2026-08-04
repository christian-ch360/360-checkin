"use client";

import { useState } from "react";
import {
  Mic,
  Disc3,
  Sparkles,
  Building2,
  Presentation,
  Scissors,
  DoorOpen,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import type { LocationType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { LocationOccupancy } from "@/features/locations/services/locations.service";

const OCCUPIED_BORDER = "border-destructive/20 bg-destructive/5";
const AVAILABLE_BORDER = "border-success/20 bg-success/5";
const OCCUPIED_PILL = "bg-destructive/15 text-destructive";
const AVAILABLE_PILL = "bg-success/15 text-success";

export const LOCATION_TYPE_META: Record<LocationType, { label: string; icon: LucideIcon }> = {
  ENTRANCE: { label: "Entrance", icon: DoorOpen },
  BOOTH: { label: "Booth", icon: Mic },
  PODCAST_ROOM: { label: "Podcast Room", icon: Mic },
  RECORDING_STUDIO: { label: "Recording Studio", icon: Disc3 },
  BEAUTY_CHAIR: { label: "Beauty Chair", icon: Sparkles },
  ROOFTOP: { label: "Rooftop", icon: Building2 },
  CONFERENCE_ROOM: { label: "Conference Room", icon: Presentation },
  EDITING_BAY: { label: "Editing Bay", icon: Scissors },
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function LocationOccupancyWidget({ locations }: { locations: LocationOccupancy[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const visible = locations.filter((l) => l.type !== "ENTRANCE");
  if (visible.length === 0) return null;

  const occupiedCount = visible.filter((l) => l.status === "OCCUPIED").length;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Space Occupancy</CardTitle>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {occupiedCount} of {visible.length} occupied
          </p>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand space occupancy" : "Collapse space occupancy"}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} />
          </button>
        </div>
      </CardHeader>
      {!collapsed && (
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((location) => {
            const meta = LOCATION_TYPE_META[location.type as LocationType];
            const Icon = meta?.icon ?? Building2;
            const occupant = location.occupants[0] ?? null;
            const isOccupied = location.status === "OCCUPIED";

            return (
              <div
                key={location.id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-3",
                  isOccupied ? OCCUPIED_BORDER : AVAILABLE_BORDER
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="size-3.5" />
                    <span className="text-xs font-medium">{meta?.label}</span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      isOccupied ? OCCUPIED_PILL : AVAILABLE_PILL
                    )}
                  >
                    <span className="size-1 rounded-full bg-current" />
                    {isOccupied ? "Occupied" : "Available"}
                  </span>
                </div>

                <p className="truncate text-sm font-medium">{location.name}</p>

                {occupant ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="size-5">
                      <AvatarImage src={occupant.profilePhotoUrl ?? undefined} alt={occupant.memberName} />
                      <AvatarFallback className="text-[9px]">{initials(occupant.memberName)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs text-muted-foreground">{occupant.memberName}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      )}
    </Card>
  );
}
