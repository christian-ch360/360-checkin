import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Camera, Clapperboard, Globe, MapPin, Music2 } from "lucide-react";
import type { SocialPlatform } from "@prisma/client";
import { cn } from "@/lib/utils";
import { CreatorPortrait } from "@/features/creator-library/components/creator-portrait";
import { CategoryChips } from "@/features/creator-library/components/category-chips";
import { C360StatusBadge } from "@/features/creator-library/components/c360-status-badge";
import { ReachTierPill } from "@/features/creator-library/components/reach-tier-pill";
import { SaveCreatorButton } from "@/features/creator-library/components/save-creator-button";
import { PLATFORM_LABELS } from "@/features/creator-library/config/library-config";
import { formatAudience } from "@/features/creator-library/lib/audience";
import type { LibraryCreatorDetail } from "@/features/creator-library/services/creator-library.service";

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : null;
}

const LINK_ICON: Record<SocialPlatform | "WEBSITE", typeof Camera> = {
  INSTAGRAM: Camera,
  TIKTOK: Music2,
  YOUTUBE: Clapperboard,
  WEBSITE: Globe,
};

/**
 * The creator profile as a premium talent portfolio on the fixed warm-ivory
 * palette — a large portrait, spacious "View [Platform]" buttons, an
 * identity block with gold-accented badges, and an AUDIENCE card with a
 * subtle-cream per-platform breakdown. Every link is guarded by
 * safeExternalUrl and only rendered when a real URL exists; nothing is
 * fabricated.
 */
export function CreatorProfile({
  creator,
  placeholderIconUrl,
}: {
  creator: LibraryCreatorDetail;
  placeholderIconUrl?: string | null;
}) {
  const links: { key: SocialPlatform | "WEBSITE"; label: string; url: string }[] = [
    { key: "INSTAGRAM" as const, label: "Instagram", url: safeExternalUrl(creator.links.instagram) ?? "" },
    { key: "TIKTOK" as const, label: "TikTok", url: safeExternalUrl(creator.links.tiktok) ?? "" },
    { key: "YOUTUBE" as const, label: "YouTube", url: safeExternalUrl(creator.links.youtube) ?? "" },
    { key: "WEBSITE" as const, label: "Website", url: safeExternalUrl(creator.links.website) ?? "" },
  ].filter((link) => link.url.length > 0);

  return (
    <div className="bg-[#FAF9F6]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <Link
          href="/creator-library"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B6B6B] transition-colors hover:text-[#161616]"
        >
          <ArrowLeft className="size-4" />
          Back to the network
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative overflow-hidden rounded-3xl border border-[#EAE1CB] shadow-xl shadow-black/10">
              <div className="aspect-[4/5]">
                <CreatorPortrait
                  name={creator.name}
                  imageUrl={creator.imageUrl}
                  seed={creator.id}
                  placeholderIconUrl={placeholderIconUrl}
                  rounded="rounded-none"
                  priority
                />
              </div>
              <div className="absolute right-3 top-3">
                <SaveCreatorButton creatorId={creator.id} />
              </div>
              {creator.featured ? (
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[#161616] shadow-sm">
                  Featured
                </span>
              ) : null}
            </div>

            {links.length > 0 ? (
              <div className="mt-4 space-y-2">
                {links.map((link) => {
                  const Icon = LINK_ICON[link.key];
                  return (
                    <a
                      key={link.key}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#EAE1CB] bg-white px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-[#161616] transition-colors hover:border-[#161616] hover:bg-[#161616] hover:text-white"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="size-4" />
                        View {link.label}
                      </span>
                      <ArrowUpRight className="size-4 opacity-60" />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="space-y-10">
            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <C360StatusBadge verified={creator.c360Verified} />
                <ReachTierPill tier={creator.reachTier} showRange />
                {creator.companyName ? (
                  <span className="text-xs text-[#6B6B6B]">· {creator.companyName}</span>
                ) : null}
              </div>
              <h1 className="flex flex-wrap items-center gap-2 text-4xl font-semibold tracking-tight text-balance text-[#161616] sm:text-5xl">
                {creator.name}
                {creator.c360Verified ? (
                  <BadgeCheck className="size-6 text-[#D4AF6A]" aria-label="Verified CreatorHub360 member" />
                ) : null}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6B6B6B]">
                {creator.username ? <span>@{creator.username}</span> : null}
                {creator.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {creator.location}
                  </span>
                ) : null}
              </div>
              {creator.categories.length > 0 ? (
                <CategoryChips categories={creator.categories} linked className="pt-1" />
              ) : null}
            </header>

            <section className="rounded-3xl border border-[#EAE1CB] bg-white p-6 shadow-sm">
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-[#B8935A] uppercase">Audience</p>
              {creator.audience.isEmpty ? (
                <p className="mt-3 text-sm text-[#6B6B6B]">Audience data unavailable</p>
              ) : (
                <>
                  <div className="mt-3 flex items-baseline gap-2 border-b-2 border-[#E8D5A3] pb-6">
                    <span className="text-5xl font-semibold tracking-tight tabular-nums text-[#161616]">
                      {formatAudience(creator.audience.total)}
                    </span>
                    <span className="text-[0.65rem] font-semibold tracking-[0.2em] text-[#6B6B6B] uppercase">
                      Total Reach
                    </span>
                  </div>
                  <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                    {creator.audience.platforms.map((entry) => (
                      <div key={entry.platform} className="rounded-xl border-l-2 border-[#D4AF6A] bg-[#F5F1E8] p-4">
                        <dt className="text-xs text-[#6B6B6B]">{PLATFORM_LABELS[entry.platform]}</dt>
                        <dd className="mt-1 text-2xl font-semibold tabular-nums text-[#161616]">{formatAudience(entry.count)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </section>

            {creator.bio ? (
              <section>
                <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-[#B8935A] uppercase">About</p>
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-[#161616]/90">{creator.bio}</p>
              </section>
            ) : null}

            {creator.categories.length > 0 ? (
              <section>
                <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-[#B8935A] uppercase">
                  Content Categories
                </p>
                <CategoryChips categories={creator.categories} linked className="mt-3" />
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreatorProfileMissing() {
  return (
    <div className="bg-[#FAF9F6] px-4 py-24">
      <div className={cn("mx-auto max-w-lg text-center")}>
        <h1 className="text-xl font-semibold text-[#161616]">Creator not found</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          This creator isn&apos;t in the network, or has been unpublished.
        </p>
        <Link
          href="/creator-library"
          className="mt-6 inline-flex h-10 items-center rounded-full border border-[#161616]/15 bg-white px-5 text-sm font-medium text-[#161616] hover:border-[#D4AF6A]"
        >
          Back to the network
        </Link>
      </div>
    </div>
  );
}
