"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSpaceCategory, SPACE_CATEGORY_LABELS, type SpaceCategory } from "@/lib/utils/space-category";
import { SPACE_CATEGORY_META } from "@/features/spaces/components/space-card";
import type { SpaceDashboardItem } from "@/features/spaces/services/spaces.service";
import { SpacesDashboard } from "@/features/spaces/components/spaces-dashboard";

const CATEGORY_ORDER: SpaceCategory[] = ["beauty", "booths", "studios", "podcast", "meeting"];

export function SpacesCategorySummary({
  spaces,
  projects,
  members,
  currentActorId,
  canManage,
}: {
  spaces: SpaceDashboardItem[];
  projects: { id: string; name: string }[];
  members: { id: string; fullName: string }[];
  currentActorId: string;
  canManage: boolean;
}) {
  const [expanded, setExpanded] = useState<SpaceCategory | null>(null);

  if (expanded) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setExpanded(null)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Back to categories
        </button>
        <SpacesDashboard
          spaces={spaces}
          projects={projects}
          members={members}
          currentActorId={currentActorId}
          canManage={canManage}
          initialStatusFilter={null}
          initialSpaceId={null}
          initialCategory={expanded}
        />
      </div>
    );
  }

  const byCategory = CATEGORY_ORDER.map((category) => {
    const inCategory = spaces.filter((s) => getSpaceCategory(s.type) === category);
    const occupied = inCategory.filter((s) => s.status === "OCCUPIED").length;
    return { category, spaces: inCategory, occupied, total: inCategory.length };
  }).filter((c) => c.total > 0);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
      {byCategory.map(({ category, occupied, total }) => {
        const meta = SPACE_CATEGORY_META[category];
        const Icon = meta.icon;
        const allOccupied = occupied === total;
        const noneOccupied = occupied === 0;

        return (
          <button
            key={category}
            type="button"
            onClick={() => setExpanded(category)}
            className="card-interactive flex flex-col gap-3 rounded-2xl border bg-card p-5 text-left shadow-sm"
          >
            <div className={cn("flex size-10 items-center justify-center rounded-xl", meta.accent)}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className="font-semibold">{SPACE_CATEGORY_LABELS[category]}</p>
              {total === 1 ? (
                <p className={cn("text-sm", allOccupied ? "text-destructive" : "text-success")}>
                  {allOccupied ? "Occupied" : "Available"}
                </p>
              ) : (
                <p
                  className={cn(
                    "text-sm",
                    allOccupied ? "text-destructive" : noneOccupied ? "text-success" : "text-warning"
                  )}
                >
                  {occupied} / {total} Occupied
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
