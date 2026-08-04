"use client";

import type { ContentCategory } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { contentCategoryValues, CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";

export function ContentCategoryPicker({
  value,
  onChange,
}: {
  value: ContentCategory[];
  onChange: (next: ContentCategory[]) => void;
}) {
  function toggle(category: ContentCategory) {
    onChange(
      value.includes(category) ? value.filter((c) => c !== category) : [...value, category]
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {contentCategoryValues.map((category) => {
        const selected = value.includes(category);
        return (
          <Badge
            key={category}
            variant={selected ? "default" : "outline"}
            className={cn("cursor-pointer select-none transition-colors", !selected && "hover:bg-muted")}
            onClick={() => toggle(category)}
          >
            {CONTENT_CATEGORY_LABELS[category]}
          </Badge>
        );
      })}
    </div>
  );
}
