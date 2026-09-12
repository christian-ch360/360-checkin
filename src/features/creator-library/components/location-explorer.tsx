"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LocationCard } from "@/features/creator-library/components/location-card";
import type { LibraryLocationSummary } from "@/features/creator-library/services/creator-library.service";

/** "Explore Locations" — search + a grid of real location cards, filtered client-side (the list is small: one row per real city/region). */
export function LocationExplorer({ summaries }: { summaries: LibraryLocationSummary[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter((s) =>
      [s.label, s.state, s.country].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  }, [summaries, query]);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#161616] sm:text-3xl">Explore Locations</h2>
          <p className="mt-1.5 text-sm text-[#6B6B6B]">Discover the cities and regions where our creators are based.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search locations…"
            aria-label="Search locations"
            className="h-11 w-full rounded-full border border-[#EAE1CB] bg-white pl-10 pr-4 text-sm text-[#161616] outline-none transition-colors placeholder:text-[#6B6B6B] focus:border-[#D4AF6A]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-[#EAE1CB] py-16 text-center text-sm text-[#6B6B6B]">
          No locations match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {filtered.map((summary) => (
            <LocationCard key={`${summary.country}-${summary.state}-${summary.city}`} summary={summary} />
          ))}
        </div>
      )}
    </section>
  );
}
