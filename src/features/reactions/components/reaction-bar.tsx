"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ReactionEmoji } from "@prisma/client";

export const REACTION_EMOJI: Record<ReactionEmoji, string> = {
  LIKE: "👍",
  LOVE: "❤️",
  FIRE: "🔥",
  CLAP: "👏",
  LAUGH: "😂",
  CELEBRATE: "🎉",
};

const ALL_EMOJI = Object.keys(REACTION_EMOJI) as ReactionEmoji[];

export type ReactionSummaryItem = { emoji: ReactionEmoji; count: number; reactedByMe: boolean };

/**
 * Shared reaction bar — used by community post cards and DM message bubbles.
 * Purely controlled: the parent owns the reaction list and persistence
 * (toggleReaction server action), this component just renders it and calls
 * back on click. `reactors` (optional) powers the "who reacted" popover.
 */
export function ReactionBar({
  reactions,
  onToggle,
  reactors,
  size = "sm",
}: {
  reactions: ReactionSummaryItem[];
  onToggle: (emoji: ReactionEmoji) => void;
  reactors?: (emoji: ReactionEmoji) => Promise<{ id: string; fullName: string }[]>;
  size?: "sm" | "xs";
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoverList, setHoverList] = useState<{ emoji: ReactionEmoji; names: string[] } | null>(null);

  async function showReactors(emoji: ReactionEmoji) {
    if (!reactors) return;
    const list = await reactors(emoji);
    setHoverList({ emoji, names: list.map((m) => m.fullName) });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {reactions
        .filter((r) => r.count > 0)
        .map((r) => (
          <Popover key={r.emoji} open={hoverList?.emoji === r.emoji} onOpenChange={(open) => !open && setHoverList(null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={() => onToggle(r.emoji)}
                onMouseEnter={() => showReactors(r.emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors",
                  size === "xs" ? "text-[11px]" : "text-xs",
                  r.reactedByMe ? "border-primary bg-primary/10" : "border-border bg-muted/40 hover:bg-muted"
                )}
              >
                <span>{REACTION_EMOJI[r.emoji]}</span>
                <span className="tabular-nums text-muted-foreground">{r.count}</span>
              </button>
            </PopoverTrigger>
            {hoverList && hoverList.emoji === r.emoji && (
              <PopoverContent className="w-auto max-w-48 p-2 text-xs" side="top">
                {hoverList.names.length > 0 ? hoverList.names.join(", ") : "Loading…"}
              </PopoverContent>
            )}
          </Popover>
        ))}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded-full border border-dashed px-1.5 py-0.5 text-muted-foreground hover:bg-muted",
              size === "xs" ? "text-[11px]" : "text-xs"
            )}
            aria-label="Add reaction"
          >
            +
          </button>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto gap-1 p-1.5" side="top">
          {ALL_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onToggle(emoji);
                setPickerOpen(false);
              }}
              className="rounded-md p-1.5 text-base hover:bg-muted"
            >
              {REACTION_EMOJI[emoji]}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
