import Link from "next/link";
import type { ContentCategory } from "@prisma/client";
import { cn } from "@/lib/utils";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";

export function CategoryChips({
  categories,
  limit,
  linked = false,
  className,
  moreHref,
}: {
  categories: ContentCategory[];
  limit?: number;
  /** When true, each chip links into the library filtered by that category. */
  linked?: boolean;
  className?: string;
  /** "See all →" target when the list is truncated (spec §10). */
  moreHref?: string;
}) {
  if (categories.length === 0) return null;

  const shown = limit ? categories.slice(0, limit) : categories;
  const hidden = limit ? Math.max(0, categories.length - limit) : 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((category) => {
        const label = CONTENT_CATEGORY_LABELS[category];
        const chipClass =
          "rounded-full border border-border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground";
        return linked ? (
          <Link
            key={category}
            href={`/creator-library?category=${category}`}
            className={cn(chipClass, "transition-colors hover:border-foreground/30 hover:text-foreground")}
          >
            {label}
          </Link>
        ) : (
          <span key={category} className={chipClass}>
            {label}
          </span>
        );
      })}
      {hidden > 0 &&
        (moreHref ? (
          <Link
            href={moreHref}
            className="text-[0.7rem] font-medium text-[var(--community)] hover:underline"
          >
            See all →
          </Link>
        ) : (
          <span className="text-[0.7rem] font-medium text-muted-foreground">+{hidden} more</span>
        ))}
    </div>
  );
}
