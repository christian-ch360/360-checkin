"use client";

import { useRef, useState, type TouchEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { categoryVisual } from "@/features/creator-library/config/category-visuals";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import { formatCompactNumber } from "@/lib/utils/format";
import type { CampaignShowcaseSummary } from "@/features/creator-library/services/campaign-showcase.service";

const PLATFORM_LABELS: Record<string, string> = { INSTAGRAM: "Instagram", TIKTOK: "TikTok", YOUTUBE: "YouTube" };

/**
 * A hand-rolled carousel (no dependency needed) — a flex row of full-width
 * slides translated by index, with prev/next, dot pagination, a "NN / NN"
 * counter, arrow-key navigation, and touch-swipe. Every stat rendered comes
 * straight from a real CampaignShowcase row; a null/empty field is simply
 * omitted rather than replaced with an invented number.
 */
export function CampaignShowcaseCarousel({ showcases }: { showcases: CampaignShowcaseSummary[] }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = showcases.length;

  function go(next: number) {
    setIndex(((next % count) + count) % count);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowLeft") go(index - 1);
    if (event.key === "ArrowRight") go(index + 1);
  }

  function onTouchStart(event: TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) go(delta > 0 ? index - 1 : index + 1);
    touchStartX.current = null;
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Previous CreatorHub360 campaigns"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="focus:outline-none"
    >
      <div className="overflow-hidden rounded-2xl border border-[#EAE1CB] bg-white" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {showcases.map((showcase) => (
            <CampaignSlide key={showcase.id} showcase={showcase} />
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous campaign"
            className="flex size-9 items-center justify-center rounded-full border border-[#E8D5A3] bg-white text-[#161616] transition-colors hover:border-[#D4AF6A] hover:bg-[#F5F1E8]"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next campaign"
            className="flex size-9 items-center justify-center rounded-full border border-[#E8D5A3] bg-white text-[#161616] transition-colors hover:border-[#D4AF6A] hover:bg-[#F5F1E8]"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {showcases.map((showcase, i) => (
            <button
              key={showcase.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to campaign ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-[#161616]" : "w-1.5 bg-[#E8D5A3] hover:bg-[#D4AF6A]"}`}
            />
          ))}
        </div>

        <p className="text-xs font-medium tracking-[0.1em] text-[#6B6B6B] tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </p>
      </div>
    </div>
  );
}

function CampaignSlide({ showcase }: { showcase: CampaignShowcaseSummary }) {
  const stats = [
    showcase.creatorCount != null ? `${formatCompactNumber(showcase.creatorCount)} Creators` : null,
    showcase.totalReach != null ? `${formatCompactNumber(showcase.totalReach)} Reach` : null,
    showcase.locations.length > 0 ? `${showcase.locations.length} ${showcase.locations.length === 1 ? "City" : "Cities"}` : null,
  ].filter((s): s is string => Boolean(s));

  return (
    <div className="w-full shrink-0">
      <div className="aspect-[16/10] w-full bg-[#F5F1E8] sm:aspect-[21/9]">
        {/* eslint-disable-next-line @next/next/no-img-element -- curated showcase asset, app has no next/image remotePatterns */}
        <img src={showcase.coverImage} alt={showcase.title} className="size-full object-cover" />
      </div>
      <div className="p-6 sm:p-8">
        <p className="text-[0.7rem] font-medium tracking-[0.24em] text-[#B8935A] uppercase">{showcase.brandName}</p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[#161616] sm:text-3xl">{showcase.title}</h3>
        {showcase.description ? <p className="mt-3 max-w-2xl text-[#6B6B6B]">{showcase.description}</p> : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B6B6B]">
          {showcase.categories.length > 0 ? (
            <span>
              {showcase.categories
                .map((c) => `${categoryVisual(c).emoji} ${CONTENT_CATEGORY_LABELS[c]}`)
                .join(" · ")}
            </span>
          ) : null}
          {showcase.platforms.length > 0 ? <span>{showcase.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(" · ")}</span> : null}
        </div>

        {stats.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-6 border-t border-[#EAE1CB] pt-5">
            {stats.map((stat) => (
              <p key={stat} className="text-sm font-semibold tracking-tight text-[#161616] tabular-nums">
                {stat}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
