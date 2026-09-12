import type { ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { CreatorPortrait } from "@/features/creator-library/components/creator-portrait";
import { PlatformBadges } from "@/features/creator-library/components/platform-badges";
import { SaveCreatorButton } from "@/features/creator-library/components/save-creator-button";
import { CategoryChips } from "@/features/creator-library/components/category-chips";
import { C360StatusBadge } from "@/features/creator-library/components/c360-status-badge";
import { ReachDisplay } from "@/features/creator-library/components/reach-display";
import type { LibraryCreatorCard } from "@/features/creator-library/services/creator-library.service";

/**
 * The one reusable premium creator card for the CreatorHub360 Creator
 * Network — a large photo-forward tile on the fixed warm-ivory/charcoal/gold
 * palette (white card, soft warm border, gold on hover), with an editorial
 * identity block, category chips, per-platform reach + TOTAL REACH, and the
 * CreatorHub360 status marker. `renderAdminControls` adds a subtle
 * management bar for the Operations grid without changing the public look.
 */
export function CreatorCard({
  creator,
  priority = false,
  renderAdminControls,
  placeholderIconUrl,
}: {
  creator: LibraryCreatorCard;
  priority?: boolean;
  renderAdminControls?: ReactNode;
  placeholderIconUrl?: string | null;
}) {
  const href = `/creator-library/${creator.id}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#EAE1CB] bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[#D4AF6A] hover:shadow-xl hover:shadow-black/10">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden">
        <CreatorPortrait
          name={creator.name}
          imageUrl={creator.imageUrl}
          seed={creator.id}
          placeholderIconUrl={placeholderIconUrl}
          rounded="rounded-none"
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {creator.featured ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[#161616] shadow-sm">
            Featured
          </span>
        ) : null}
        {creator.platforms.length > 0 ? (
          <PlatformBadges platforms={creator.platforms} className="absolute bottom-3 left-3" />
        ) : null}
      </Link>

      <div className="absolute right-3 top-3">
        <SaveCreatorButton creatorId={creator.id} />
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-[0.95rem] font-semibold leading-tight text-[#161616]">
            <Link href={href} className="truncate hover:underline">
              {creator.name}
            </Link>
            {creator.c360Verified ? (
              <BadgeCheck className="size-4 shrink-0 text-[#D4AF6A]" aria-label="Verified CreatorHub360 member" />
            ) : null}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6B6B6B]">
            {creator.username ? <span className="truncate">@{creator.username}</span> : null}
            {creator.location ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{creator.location}</span>
              </span>
            ) : null}
          </div>
        </div>

        {creator.categories.length > 0 ? (
          <CategoryChips categories={creator.categories} limit={3} moreHref={href} />
        ) : null}

        <div className="mt-auto border-t border-[#EAE1CB] pt-3.5">
          <ReachDisplay audience={creator.audience} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <C360StatusBadge verified={creator.c360Verified} size="sm" />
          <Link href={href} className="text-xs font-medium text-[#B8935A] hover:underline">
            View Profile →
          </Link>
        </div>

        {renderAdminControls ? (
          <div className="-mx-4 -mb-4 mt-1 border-t border-[#EAE1CB] bg-[#F5F1E8] px-4 py-2.5">{renderAdminControls}</div>
        ) : null}
      </div>
    </article>
  );
}
