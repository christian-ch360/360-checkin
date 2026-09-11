import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils/format";
import type { LibraryReachCount } from "@/features/creator-library/services/creator-library.service";

const TIER_GRADIENT: Record<string, string> = {
  elite: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
  major: "linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)",
  influential: "linear-gradient(135deg, #3730a3 0%, #818cf8 100%)",
  established: "linear-gradient(135deg, #0f766e 0%, #2dd4bf 100%)",
  rising: "linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)",
  emerging: "linear-gradient(135deg, #475569 0%, #94a3b8 100%)",
};

/** Spec §16 — reach tiers as visual cards; click filters the grid. */
export function LibraryReachView({ tiers }: { tiers: LibraryReachCount[] }) {
  const totalCreators = tiers.reduce((sum, t) => sum + t.count, 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
      <p className="text-[0.7rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">Browse by</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Reach</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Total audience across Instagram, TikTok, and YouTube.
        {totalCreators > 0 ? ` ${formatCompactNumber(totalCreators)} creators tiered.` : ""}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map(({ tier, count }) => (
          <Link
            key={tier.key}
            href={`/creator-library?reach=${tier.key}`}
            className="group relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl border border-border p-5 transition-transform hover:-translate-y-0.5"
            style={{ background: TIER_GRADIENT[tier.key] }}
          >
            <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/15" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-white">{tier.label}</p>
                <p className="text-xs text-white/75">{tier.range}</p>
              </div>
              <ArrowUpRight className="size-4 text-white/70" />
            </div>
            <p className="relative text-3xl font-semibold tabular-nums text-white">
              {count}
              <span className="ml-1.5 text-sm font-normal text-white/70">creator{count === 1 ? "" : "s"}</span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
