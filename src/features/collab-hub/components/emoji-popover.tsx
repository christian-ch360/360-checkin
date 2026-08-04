"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

const EMOJI = [
  "😀", "😂", "😍", "😎", "🥳", "😢", "😮", "🙌",
  "👍", "👎", "🔥", "✨", "🎉", "❤️", "💯", "👀",
  "🙏", "💪", "🤝", "👏", "😅", "🤔", "😴", "🥲",
  "😇", "🤩", "😬", "😭", "🚀", "✅", "❌", "⭐",
];

export function EmojiPopover({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0">
          <Smile className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              className="rounded-md p-1.5 text-lg hover:bg-muted"
              onClick={() => onSelect(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
