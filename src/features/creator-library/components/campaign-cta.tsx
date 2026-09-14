import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * "Request a Campaign" — the entry point into the campaign builder from the
 * top bar. Deliberately not a generic SaaS "primary button" (solid fill,
 * drop shadow): a refined pill with a hairline champagne-gold border, white
 * ground, and a subtle fill-on-hover, matching the same restrained luxury
 * language as the rest of the masthead.
 */
export function CampaignCta() {
  return (
    <Link
      href="/creator-library/campaigns/new"
      aria-label="Request a Campaign"
      className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D4AF6A] bg-white px-3 py-1.5 text-xs font-medium tracking-wide text-[#161616] transition-all duration-200 hover:border-[#B8935A] hover:bg-[#F5F1E8] sm:px-4"
    >
      <Sparkles className="size-3.5 text-[#B8935A] transition-transform duration-200 group-hover:scale-110" aria-hidden />
      <span className="hidden sm:inline">Request a Campaign</span>
    </Link>
  );
}
