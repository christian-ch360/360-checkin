"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SearchResults = {
  posts: { id: string; body: string; author: { fullName: string } }[];
  people: { id: string; fullName: string; username: string | null; profilePhotoUrl: string | null }[];
  hashtags: { id: string; tag: string }[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CommunitySearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/community/search?q=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data);
          setOpen(true);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasResults = results && (results.posts.length > 0 || results.people.length > 0 || results.hashtags.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setOpen(true)}
        placeholder="Search posts, people, hashtags…"
        className="h-9 pl-8"
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}

      {open && results && (
        <div className="absolute z-30 mt-1 w-full max-h-96 overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg">
          {!hasResults && <p className="p-2 text-sm text-muted-foreground">No matches.</p>}

          {results.hashtags.length > 0 && (
            <div className="mb-2">
              <p className="px-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Hashtags</p>
              {results.hashtags.map((h) => (
                <Link
                  key={h.id}
                  href={`/community?hashtag=${h.tag}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  #{h.tag}
                </Link>
              ))}
            </div>
          )}

          {results.people.length > 0 && (
            <div className="mb-2">
              <p className="px-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">People</p>
              {results.people.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                  <Avatar className="size-6">
                    {p.profilePhotoUrl && <AvatarImage src={p.profilePhotoUrl} />}
                    <AvatarFallback className="text-[10px]">{initials(p.fullName)}</AvatarFallback>
                  </Avatar>
                  {p.fullName}
                </div>
              ))}
            </div>
          )}

          {results.posts.length > 0 && (
            <div>
              <p className="px-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Posts</p>
              {results.posts.map((p) => (
                <div key={p.id} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <span className="font-medium">{p.author.fullName}:</span>{" "}
                  <span className="line-clamp-1 text-muted-foreground">{p.body}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
