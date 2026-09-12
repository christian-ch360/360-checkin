import Link from "next/link";
import { MapPin } from "lucide-react";
import type { LibraryLocationTree } from "@/features/creator-library/services/creator-library.service";

/**
 * Spec §15 — Country → State → City drill-down. Rendered as nested
 * <details> so it works without client JS; each leaf links into the grid
 * filtered by that location.
 */
export function LibraryLocationsView({ tree }: { tree: LibraryLocationTree }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
      <p className="text-[0.7rem] font-medium tracking-[0.24em] text-[#6B6B6B] uppercase">Browse by</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Locations</h1>

      {tree.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-[#EAE1CB] py-16 text-center text-sm text-[#6B6B6B]">
          No creators have a location yet — add Country / State / City on import or in the profile editor.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {tree.map((country) => (
            <details key={country.country} className="rounded-2xl border border-[#EAE1CB]" open={tree.length <= 2}>
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 text-[#6B6B6B]" />
                  <Link
                    href={`/creator-library?country=${encodeURIComponent(country.country)}`}
                    className="hover:underline"
                  >
                    {country.country}
                  </Link>
                </span>
                <span className="text-xs text-[#6B6B6B]">{country.count}</span>
              </summary>
              <div className="space-y-1.5 border-t border-[#EAE1CB]/60 px-4 py-3">
                {country.states.map((state) => (
                  <details key={state.state} className="rounded-lg">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-[#F5F1E8]">
                      <Link
                        href={`/creator-library?country=${encodeURIComponent(country.country)}&state=${encodeURIComponent(state.state)}`}
                        className="hover:underline"
                      >
                        {state.state === "—" ? "Unspecified state" : state.state}
                      </Link>
                      <span className="text-xs text-[#6B6B6B]">{state.count}</span>
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-4">
                      {state.cities.map((city) => (
                        <li key={city.city} className="flex items-center justify-between gap-3 py-1 text-sm">
                          <Link
                            href={`/creator-library?country=${encodeURIComponent(country.country)}&state=${encodeURIComponent(state.state)}&city=${encodeURIComponent(city.city)}`}
                            className="text-[#6B6B6B] hover:text-[#161616] hover:underline"
                          >
                            {city.city === "—" ? "Unspecified city" : city.city}
                          </Link>
                          <span className="text-xs text-[#6B6B6B]">{city.count}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
