import Link from "next/link";
import { SearchX, Users } from "lucide-react";
import { CreatorCard } from "@/features/creator-library/components/creator-card";
import type { LibraryCreatorCard } from "@/features/creator-library/services/creator-library.service";

export function CreatorGrid({
  creators,
  priorityCount = 4,
  placeholderIconUrl,
}: {
  creators: LibraryCreatorCard[];
  priorityCount?: number;
  placeholderIconUrl?: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {creators.map((creator, index) => (
        <CreatorCard
          key={creator.id}
          creator={creator}
          priority={index < priorityCount}
          placeholderIconUrl={placeholderIconUrl}
        />
      ))}
    </div>
  );
}

export function CreatorGridEmpty({ reason }: { reason: "no-results" | "empty-library" }) {
  const Icon = reason === "no-results" ? SearchX : Users;
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#EAE1CB] bg-white py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-[#F5F1E8] text-[#B8935A]">
        <Icon className="size-5" />
      </div>
      {reason === "no-results" ? (
        <>
          <p className="text-sm font-medium text-[#161616]">No creators match these filters</p>
          <p className="max-w-sm text-sm text-[#6B6B6B]">
            Try removing a filter or searching a different name, category, or city.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-[#161616]">The network is just getting started</p>
          <p className="max-w-sm text-sm text-[#6B6B6B]">
            No creators have been published to the library yet. Check back soon.
          </p>
        </>
      )}
    </div>
  );
}

export function LoadMore({
  currentPage,
  remaining,
  searchParams,
}: {
  currentPage: number;
  remaining: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (remaining <= 0) return null;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(currentPage + 1));

  return (
    <div className="mt-10 flex flex-col items-center gap-2">
      <Link
        href={`/creator-library?${params.toString()}`}
        scroll={false}
        prefetch={false}
        className="inline-flex h-10 items-center justify-center rounded-full border border-[#161616]/15 bg-white px-6 text-sm font-medium text-[#161616] transition-colors hover:border-[#D4AF6A] hover:bg-[#F5F1E8]"
      >
        Load more creators
      </Link>
      <p className="text-xs text-[#6B6B6B]">{remaining} more</p>
    </div>
  );
}
