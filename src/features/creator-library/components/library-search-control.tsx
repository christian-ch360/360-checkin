"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * The Creator Library's one search entry point — an icon that expands into a
 * full-width overlay bar across the top-bar row (rather than squeezing a
 * fixed-width input in next to the wordmark, which breaks on mobile).
 * Submits into the same `?search=` param the creator grid already filters
 * on, merged with whatever other filters (category, location, reach, sort)
 * are currently active, so search and category pills combine rather than
 * override each other. Always routes to the main Creators grid — the only
 * view that renders filtered results.
 */
export function LibrarySearchControl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSearch = searchParams.get("search") ?? "";

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(activeSearch);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(activeSearch);
  }, [activeSearch]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function apply(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = nextValue.trim();
    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }
    params.delete("page");
    const qs = params.toString();
    const isHome = pathname === "/creator-library" && !searchParams.get("view");
    router.push(`/creator-library${qs ? `?${qs}` : ""}`, { scroll: !isHome });
  }

  // Debounced live search while the overlay is open and typing.
  useEffect(() => {
    if (!open || value === activeSearch) return;
    const timer = setTimeout(() => apply(value), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  function close() {
    setOpen(false);
    if (activeSearch) apply("");
  }

  // `absolute inset-0` below anchors to the top bar's row container, which
  // must be `position: relative` — not to this component's own wrapper —
  // so the overlay spans the full row (wordmark through icon) rather than
  // just this button's small box.
  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search creators"
          className="flex size-8 items-center justify-center rounded-full text-[#6B6B6B] transition-colors hover:bg-[#161616]/5 hover:text-[#161616]"
        >
          <Search className="size-4" />
        </button>
      ) : null}

      <div
        aria-hidden={!open}
        className={`absolute inset-0 flex items-center gap-3 bg-[#FAF9F6] px-4 transition-opacity duration-200 sm:px-8 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Search className="size-4 shrink-0 text-[#B8935A]" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={value}
          tabIndex={open ? 0 : -1}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply(value);
            } else if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
          placeholder="Search by name, username, category, or location"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#161616] placeholder:text-[#6B6B6B]/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={close}
          tabIndex={open ? 0 : -1}
          aria-label="Close search"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#6B6B6B] transition-colors hover:bg-[#161616]/5 hover:text-[#161616]"
        >
          <X className="size-4" />
        </button>
      </div>
    </>
  );
}
