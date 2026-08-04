"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Search, Loader2, CalendarClock, Heart, DoorOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { getSpaceCategory, SPACE_CATEGORY_LABELS, type SpaceCategory } from "@/lib/utils/space-category";
import { SPACE_CATEGORY_META } from "@/features/spaces/components/space-card";
import { SpaceOverviewCard } from "@/features/spaces/components/space-overview-card";
import { useFavoriteSpaces } from "@/hooks/use-favorite-spaces";
import type { SpaceDashboardItem, SpaceStatus } from "@/features/spaces/services/spaces.service";

// The drawer pulls in the calendar (react-day-picker), the booking form
// (react-hook-form + zod + several Selects), and the QR scanner — none of
// it is needed until a member actually opens a space, so it's split into
// its own chunk instead of shipping with every /spaces page load.
const SpaceDrawer = dynamic(
  () => import("@/features/spaces/components/space-drawer").then((m) => m.SpaceDrawer),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

type FilterKey = "all" | SpaceCategory;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "beauty", label: SPACE_CATEGORY_LABELS.beauty },
  { key: "booths", label: SPACE_CATEGORY_LABELS.booths },
  { key: "studios", label: SPACE_CATEGORY_LABELS.studios },
  { key: "podcast", label: SPACE_CATEGORY_LABELS.podcast },
  { key: "meeting", label: SPACE_CATEGORY_LABELS.meeting },
];

type StatusFilterKey = "available" | "occupied" | "my-bookings" | "favorites";

const STATUS_FILTERS: { key: StatusFilterKey; label: string; icon: typeof CalendarClock }[] = [
  { key: "available", label: "Available", icon: CalendarClock },
  { key: "occupied", label: "Occupied", icon: CalendarClock },
  { key: "my-bookings", label: "My Bookings", icon: CalendarClock },
  { key: "favorites", label: "Favorites", icon: Heart },
];

function isMyBooking(space: SpaceDashboardItem, currentActorId: string): boolean {
  return (
    space.activeSession?.memberId === currentActorId ||
    space.currentReservation?.memberId === currentActorId ||
    space.todayReservations.some((r) => r.memberId === currentActorId) ||
    space.upcomingReservations.some((r) => r.memberId === currentActorId)
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function SpacesDashboard({
  spaces,
  projects,
  members,
  currentActorId,
  canManage,
  initialStatusFilter = null,
  initialSpaceId = null,
  initialCategory = null,
}: {
  spaces: SpaceDashboardItem[];
  projects: { id: string; name: string }[];
  members: { id: string; fullName: string }[];
  currentActorId: string;
  canManage: boolean;
  initialStatusFilter?: StatusFilterKey | null;
  initialSpaceId?: string | null;
  initialCategory?: SpaceCategory | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>(initialCategory ?? "all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey | null>(initialStatusFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialBooking, setInitialBooking] = useState(false);
  const { isFavorite, toggleFavorite, isHydrated: favoritesHydrated } = useFavoriteSpaces();

  // Deep-link from the Space Details page's "Book this space" CTA
  // (/spaces?space=<id>) — auto-opens the existing booking drawer for that
  // space once, reusing the same flow as clicking "Book" on a card.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !initialSpaceId) return;
    deepLinkHandled.current = true;
    if (spaces.some((s) => s.id === initialSpaceId)) {
      setSelectedId(initialSpaceId);
      setInitialBooking(true);
      setDrawerOpen(true);
    }
  }, [initialSpaceId, spaces]);

  const stats = useMemo(() => {
    const counts: Record<SpaceStatus, number> = { AVAILABLE: 0, OCCUPIED: 0, RESERVED: 0 };
    for (const s of spaces) counts[s.status]++;
    return { total: spaces.length, ...counts };
  }, [spaces]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return spaces.filter((s) => {
      const category = getSpaceCategory(s.type);
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        SPACE_CATEGORY_LABELS[category].toLowerCase().includes(query) ||
        s.equipment.some((e) => e.toLowerCase().includes(query));
      const matchesCategory = filter === "all" || category === filter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "available" && s.status === "AVAILABLE") ||
        (statusFilter === "occupied" && s.status === "OCCUPIED") ||
        (statusFilter === "my-bookings" && isMyBooking(s, currentActorId)) ||
        (statusFilter === "favorites" && favoritesHydrated && isFavorite(s.id));
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [spaces, search, filter, statusFilter, currentActorId, favoritesHydrated, isFavorite]);

  const selectedSpace = spaces.find((s) => s.id === selectedId) ?? null;

  function handleQuickBook(id: string) {
    setSelectedId(id);
    setInitialBooking(true);
    setDrawerOpen(true);
  }

  function handleBooked() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Spaces" value={stats.total} />
        <StatTile label="Available" value={stats.AVAILABLE} />
        <StatTile label="Occupied" value={stats.OCCUPIED} />
        <StatTile label="Reserved" value={stats.RESERVED} />
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, category, or equipment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const Icon = f.key === "all" ? null : SPACE_CATEGORY_META[f.key].icon;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {Icon && <Icon className="size-3.5" />}
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const Icon = f.icon;
          const active = statusFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(active ? null : f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No spaces match your filters"
          description="Try a different category or clear your search."
        />
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {filtered.map((space) => (
              <SpaceOverviewCard
                key={space.id}
                space={space}
                onQuickBook={handleQuickBook}
                isFavorite={favoritesHydrated && isFavorite(space.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {selectedSpace && (
        <SpaceDrawer
          space={selectedSpace}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onBooked={handleBooked}
          initialBooking={initialBooking}
          projects={projects}
          members={members}
          currentActorId={currentActorId}
          canManage={canManage}
        />
      )}
    </div>
  );
}
