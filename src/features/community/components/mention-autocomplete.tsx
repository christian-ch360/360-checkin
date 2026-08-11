"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MentionCandidate = { id: string; username: string | null; fullName: string; profilePhotoUrl: string | null };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * A Textarea with inline @mention autocomplete — shared by the community
 * post composer, comment composer, and (future) DM composer. Detects an "@"
 * immediately before the caret, queries /api/community/mentions, and
 * replaces the partial token with "@username " on selection.
 */
export function MentionAutocomplete({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<MentionCandidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (query === null) return;
    const timeout = setTimeout(() => {
      fetch(`/api/community/mentions?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data.results ?? []);
          setActiveIndex(0);
        })
        .catch(() => setResults([]));
    }, 150);
    return () => clearTimeout(timeout);
  }, [query]);

  function detectMentionTrigger(text: string, caret: number) {
    const upToCaret = text.slice(0, caret);
    const match = upToCaret.match(/@([a-zA-Z0-9_]*)$/);
    setQuery(match ? match[1] : null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    detectMentionTrigger(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }

  function selectMention(candidate: MentionCandidate) {
    const textarea = textareaRef.current;
    if (!textarea || !candidate.username) return;
    const caret = textarea.selectionStart;
    const upToCaret = value.slice(0, caret);
    const replaced = upToCaret.replace(/@([a-zA-Z0-9_]*)$/, `@${candidate.username} `);
    const next = replaced + value.slice(caret);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = replaced.length;
      textarea.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (query === null || results.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + results.length) % results.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            selectMention(results[activeIndex]);
          } else if (e.key === "Escape") {
            setQuery(null);
          }
        }}
        placeholder={placeholder}
        rows={rows}
        className={className}
        autoFocus={autoFocus}
      />
      {query !== null && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-64 rounded-lg border bg-popover p-1 shadow-md">
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectMention(r);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                i === activeIndex ? "bg-muted" : "hover:bg-muted"
              )}
            >
              <Avatar className="size-6">
                {r.profilePhotoUrl && <AvatarImage src={r.profilePhotoUrl} />}
                <AvatarFallback className="text-[10px]">{initials(r.fullName)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{r.fullName}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">@{r.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
