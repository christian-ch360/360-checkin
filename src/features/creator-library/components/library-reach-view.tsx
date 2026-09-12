import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils/format";
import type { LibraryReachCount } from "@/features/creator-library/services/creator-library.service";

// A restrained gold-to-charcoal family rather than a hue per tier — deeper,
// warmer gold reads as the higher rung, matching ReachTierPill's language.
const TIER_GRADIENT: Record<string, string> = {
  elite: "linear-gradient(135deg, #161616 0%, #D4AF6A 100%)",
  major: "linear-gradient(135deg, #8A6A2E 0%, #D4AF6A 100%)",
  influential: "linear-gradient(135deg, #A9812F 0%, #E8D5A3 100%)",
  established: "linear-gradient(135deg, #B8935A 0%, #E8D5A3 100%)",
  rising: "linear-gradient(135deg, #C7A56E 0%, #F0E4C8 100%)",
  emerging: "linear-gradient(135deg, #8C8C8C 0%, #D9D3C4 100%)",
};

/** Reach tiers as visual cards on the gold-to-charcoal family; click filters the grid. */
export function LibraryReachView({ tiers }: { tiers: LibraryReachCount[] }) {
  const totalCreators = tiers.reduce((sum, t) => sum + t.count, 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
      <p className="text-[0.7rem] font-medium tracking-[0.24em] text-[#B8935A] uppercase">Browse by</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#161616] sm:text-4xl">Reach</h1>
      <p className="mt-2 max-w-lg text-sm text-[#6B6B6B]">
        Total audience across Instagram, TikTok, and YouTube.
        {totalCreators > 0 ? ` ${formatCompactNumber(totalCreators)} creators tiered.` : ""}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map(({ tier, count }) => (
          <Link
            key={tier.key}
            href={`/creator-library?reach=${tier.key}`}
            className="group relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl border border-[#EAE1CB] p-5 transition-transform hover:-translate-y-0.5"
            style={{ background: TIER_GRADIENT[tier.key] }}
          >
            <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-white">{tier.label}</p>
                <p className="text-xs text-white/80">{tier.range}</p>
              </div>
              <ArrowUpRight className="size-4 text-white/80" />
            </div>
            <p className="relative text-3xl font-semibold tabular-nums text-white">
              {count}
              <span className="ml-1.5 text-sm font-normal text-white/80">creator{count === 1 ? "" : "s"}</span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
