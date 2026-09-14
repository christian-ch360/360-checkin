"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Minus, Plus, Locate } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreatorPortrait } from "@/features/creator-library/components/creator-portrait";
import type { LibraryLocationSummary } from "@/features/creator-library/services/creator-library.service";

// Standard, freely-licensed 110m-resolution world atlas topojson (the usual
// react-simple-maps geography source) — real country geometry, fetched once
// client-side and cached by the browser; no API key required.
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type FocusLevel = "world" | "country" | "state";

/**
 * The Locations page centerpiece — a real, recognizable world map (actual
 * country geometry via react-simple-maps) rendered in the fixed
 * ivory/charcoal/gold palette, with gold markers geocoded from real Creator
 * Library location data. Decorative only in *style*, not in geography.
 */
export function CreatorLocationMap({
  summaries,
  totalCreators,
}: {
  summaries: LibraryLocationSummary[];
  totalCreators: number;
}) {
  const markers = useMemo(() => summaries.filter((s) => s.coords), [summaries]);

  const topCountry = useMemo(() => {
    const totals = new Map<string, number>();
    for (const s of summaries) totals.set(s.country, (totals.get(s.country) ?? 0) + s.count);
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [summaries]);

  const topState = useMemo(() => {
    if (!topCountry) return null;
    const totals = new Map<string, number>();
    for (const s of summaries) {
      if (s.country === topCountry && s.state) totals.set(s.state, (totals.get(s.state) ?? 0) + s.count);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [summaries, topCountry]);

  const tabs: { key: FocusLevel; label: string }[] = [
    { key: "world", label: "World" },
    ...(topCountry ? [{ key: "country" as const, label: topCountry }] : []),
    ...(topState ? [{ key: "state" as const, label: topState }] : []),
  ];

  // The most prominent real location is focused by default — this is
  // deliberately data-driven, never a hardcoded city.
  const defaultFocus: FocusLevel = topState ? "state" : topCountry ? "country" : "world";
  const [focus, setFocus] = useState<FocusLevel>(defaultFocus);
  const [selected, setSelected] = useState<LibraryLocationSummary | null>(
    markers.find((m) => m.state === topState) ?? markers[0] ?? null,
  );
  const [manualZoom, setManualZoom] = useState(1);

  const focusedMarkers = useMemo(() => {
    if (focus === "country" && topCountry) return markers.filter((m) => m.country === topCountry);
    if (focus === "state" && topState) return markers.filter((m) => m.state === topState);
    return markers;
  }, [markers, focus, topCountry, topState]);

  const { center, zoom } = useMemo(() => {
    const base = focus === "world" ? 1 : focus === "country" ? 2.4 : 4;
    const z = Math.min(8, Math.max(1, base * manualZoom));
    if (focus === "world" || focusedMarkers.length === 0) return { center: [0, 10] as [number, number], zoom: Math.min(4, z) };
    const lng = focusedMarkers.reduce((s, m) => s + m.coords!.lng, 0) / focusedMarkers.length;
    const lat = focusedMarkers.reduce((s, m) => s + m.coords!.lat, 0) / focusedMarkers.length;
    return { center: [lng, lat] as [number, number], zoom: z };
  }, [focus, focusedMarkers, manualZoom]);

  function selectTab(tab: FocusLevel) {
    setFocus(tab);
    setManualZoom(1);
    const next =
      tab === "country" ? markers.find((m) => m.country === topCountry) : tab === "state" ? markers.find((m) => m.state === topState) : markers[0];
    if (next) setSelected(next);
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#EAE1CB] bg-[#FAF9F6] shadow-sm">
      {/* Segmented level tabs — capped to leave room for the zoom controls
          (reserved via the max-w below) and horizontally scrollable with a
          hidden scrollbar so a long "World / United States / California"
          row never collides with or overflows past them on a narrow phone. */}
      {tabs.length > 1 ? (
        <div className="absolute left-4 top-4 z-20 max-w-[calc(100%-5rem)] overflow-x-auto rounded-full border border-[#EAE1CB] bg-white/95 p-1 shadow-sm backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  focus === tab.key ? "bg-[#B8935A] text-white" : "text-[#161616] hover:bg-[#F5F1E8]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Zoom controls */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-1.5">
        {[
          { icon: Plus, label: "Zoom in", onClick: () => setManualZoom((z) => Math.min(3, z + 0.4)) },
          { icon: Minus, label: "Zoom out", onClick: () => setManualZoom((z) => Math.max(0.6, z - 0.4)) },
          { icon: Locate, label: "Recenter", onClick: () => { setFocus("world"); setManualZoom(1); } },
        ].map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            aria-label={label}
            className="grid size-9 place-items-center rounded-xl border border-[#EAE1CB] bg-white text-[#161616] shadow-sm transition-colors hover:border-[#D4AF6A]"
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>

      {/* Map — taller on mobile so the top controls and the bottom floating
          cards have room to breathe instead of colliding on a short box. */}
      <div className="aspect-[4/5] w-full sm:aspect-[2/1]">
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 155 }}
          className="size-full [&_.rsm-svg]:size-full"
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup center={center} zoom={zoom} minZoom={1} maxZoom={12} filterZoomEvent={() => false}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#F1EBDD"
                    stroke="rgba(184, 147, 90, 0.20)"
                    strokeWidth={0.5}
                    className="outline-none transition-colors hover:fill-[#EADFC4] focus:outline-none"
                  />
                ))
              }
            </Geographies>

            {markers.map((summary) => {
              const isSelected = selected === summary;
              const dimmed = focus !== "world" && !focusedMarkers.includes(summary);
              const size = Math.min(15, Math.max(7, 5 + Math.sqrt(summary.count) * 2.2)) / Math.sqrt(zoom);
              return (
                <Marker
                  key={`${summary.country}-${summary.state}-${summary.city}`}
                  coordinates={[summary.coords!.lng, summary.coords!.lat]}
                  onClick={() => setSelected(summary)}
                  className={cn("cursor-pointer transition-opacity", dimmed && "opacity-30")}
                >
                  <circle r={size * (isSelected ? 2.2 : 1.5)} className={isSelected ? "fill-[#D4AF6A]/25" : "fill-[#D4AF6A]/15"} />
                  <circle
                    r={size}
                    strokeWidth={1.5 / Math.sqrt(zoom)}
                    className={cn("stroke-white", isSelected ? "fill-[#161616]" : "fill-[#D4AF6A] hover:fill-[#B8935A]")}
                  />
                  {size >= 9 ? (
                    <text
                      textAnchor="middle"
                      dy=".3em"
                      className="pointer-events-none select-none fill-white font-semibold"
                      style={{ fontSize: `${8 / Math.sqrt(zoom)}px` }}
                    >
                      {summary.count}
                    </text>
                  ) : null}
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Floating creator card */}
      {selected ? (
        <div className="absolute bottom-4 left-4 right-4 z-20 max-w-72 rounded-2xl border border-[#D4AF6A]/50 bg-white p-4 shadow-xl shadow-black/10 sm:right-auto">
          <p className="text-base font-semibold text-[#161616]">{selected.label}</p>
          <p className="text-xs text-[#6B6B6B]">{[selected.state, selected.country].filter(Boolean).join(", ")}</p>
          <p className="mt-2 text-sm font-medium text-[#8A6A2E]">
            {selected.count} Creator{selected.count === 1 ? "" : "s"}
          </p>
          <div className="mt-3 flex items-center">
            <AvatarStack creators={selected.creators} total={selected.count} />
          </div>
          <Link
            href={buildExploreHref(selected)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#B8935A] hover:underline"
          >
            Explore Creators →
          </Link>
        </div>
      ) : null}

      {/* Counter card — hidden on narrow screens where the floating creator
          card already takes the full width and conveys the same total. */}
      <div className="absolute bottom-4 right-4 z-20 hidden max-w-[11rem] rounded-2xl border border-[#EAE1CB] bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur sm:right-6 sm:block">
        <p className="flex items-center gap-1.5 text-sm font-medium text-[#161616]">
          <span className="size-2 shrink-0 rounded-full bg-[#D4AF6A]" aria-hidden />
          {markers.length} location{markers.length === 1 ? "" : "s"}
        </p>
        <p className="text-xs text-[#6B6B6B]">{totalCreators} creators total</p>
      </div>

      {/* Editorial script accent — parked in open ocean space, well clear of
          the tabs/controls above and the floating cards below so it's never
          clipped or overlapping. */}
      <p className="pointer-events-none absolute right-6 top-1/2 z-10 hidden max-w-[9rem] -translate-y-1/2 text-right text-lg italic leading-[1.15] text-[#161616]/60 lg:block [font-family:var(--font-script),cursive]">
        Creators
        <br />
        Build
        <br />
        What&rsquo;s Next.
      </p>
    </div>
  );
}

function AvatarStack({ creators, total }: { creators: { id: string; name: string; imageUrl: string | null }[]; total: number }) {
  const extra = total - creators.length;
  return (
    <div className="flex items-center">
      {creators.map((creator, i) => (
        <div
          key={creator.id}
          className="-ml-2 size-7 overflow-hidden rounded-full border-2 border-white first:ml-0"
          style={{ zIndex: creators.length - i }}
        >
          <CreatorPortrait name={creator.name} imageUrl={creator.imageUrl} seed={creator.id} rounded="rounded-none" />
        </div>
      ))}
      {extra > 0 ? (
        <span className="-ml-2 grid size-7 place-items-center rounded-full border-2 border-white bg-[#F5F1E8] text-[0.65rem] font-semibold text-[#6B6B6B]">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function buildExploreHref(summary: LibraryLocationSummary): string {
  const params = new URLSearchParams();
  params.set("country", summary.country);
  if (summary.state) params.set("state", summary.state);
  if (summary.city) params.set("city", summary.city);
  return `/creator-library?${params.toString()}`;
}
