import type { ReactNode } from "react";
import { Globe, MapPin } from "lucide-react";
import type { LibraryLocationTree } from "@/features/creator-library/services/creator-library.service";

/** A quiet, editorial country → state → city hierarchy — real counts, connected with thin lines rather than a developer tree view. */
export function LocationBreakdown({ tree }: { tree: LibraryLocationTree }) {
  return (
    <div className="rounded-3xl border border-[#EAE1CB] bg-white p-6">
      <h3 className="text-sm font-semibold text-[#161616]">Location Breakdown</h3>
      <div className="mt-4 space-y-1">
        {tree.map((country) => (
          <div key={country.country}>
            <Row icon={<Globe className="size-4 text-[#B8935A]" />} label={country.country} count={country.count} />
            <div className="ml-2 border-l border-[#EAE1CB] pl-4">
              {country.states.map((state) => (
                <div key={state.state}>
                  <Row
                    icon={<MapPin className="size-3.5 text-[#B8935A]" />}
                    label={state.state === "—" ? "Unspecified state" : state.state}
                    count={state.count}
                  />
                  <div className="ml-2 border-l border-[#EAE1CB] pl-4">
                    {state.cities.map((city) => (
                      <Row
                        key={city.city}
                        icon={<MapPin className="size-3 text-[#D4AF6A]" />}
                        label={city.city === "—" ? "Unspecified city" : city.city}
                        count={city.count}
                        muted
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ icon, label, count, muted = false }: { icon: ReactNode; label: string; count: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className={`flex items-center gap-2 text-sm ${muted ? "text-[#6B6B6B]" : "font-medium text-[#161616]"}`}>
        {icon}
        {label}
      </span>
      <span className="text-sm tabular-nums text-[#6B6B6B]">{count}</span>
    </div>
  );
}
