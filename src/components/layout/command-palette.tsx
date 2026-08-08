"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FolderKanban,
  Building2,
  Tags,
  DoorOpen,
  LayoutDashboard,
  QrCode,
  TrendingUp,
  Percent,
  Megaphone,
  Plus,
  History,
  PartyPopper,
  FileSpreadsheet,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUIStore } from "@/stores/ui-store";
import type { SearchResult } from "@/features/dashboard/services/search";

const TYPE_ICON: Record<SearchResult["type"], typeof Users> = {
  member: Users,
  project: FolderKanban,
  company: Building2,
  brand: Tags,
  space: DoorOpen,
  collabPost: Megaphone,
};

const QUICK_LINKS = [
  { title: "Open Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Check In", href: "/check-in", icon: QrCode },
  { title: "GMV", href: "/gmv", icon: TrendingUp },
  { title: "Commissions", href: "/commissions", icon: Percent },
  { title: "Events", href: "/events", icon: PartyPopper },
  { title: "Reports", href: "/reports", icon: FileSpreadsheet },
];

const CREATE_COMMANDS = [
  { title: "Create Project", href: "/projects?new=1", icon: Plus },
  { title: "Reserve Space", href: "/spaces", icon: Plus },
  { title: "Create Brand", href: "/brands?new=1", icon: Plus },
  { title: "Create Member", href: "/members?new=1", icon: Plus },
];

const RECENT_SEARCHES_KEY = "ch360-recent-searches";
const MAX_RECENT = 5;

function loadRecent(): SearchResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as SearchResult[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(result: SearchResult) {
  if (typeof window === "undefined") return;
  const existing = loadRecent().filter((r) => !(r.type === result.type && r.id === result.id));
  const next = [result, ...existing].slice(0, MAX_RECENT);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) setRecent(loadRecent());
  }, [commandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
          });
          if (res.ok) {
            const data = await res.json();
            setResults(data.results ?? []);
          }
        } catch (err) {
          if (!(err instanceof DOMException && err.name === "AbortError")) throw err;
        }
      });
    }, 120);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, commandPaletteOpen]);

  function go(href: string) {
    setCommandPaletteOpen(false);
    setQuery("");
    router.push(href);
  }

  function selectResult(result: SearchResult) {
    saveRecent(result);
    go(result.href);
  }

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      title="Search"
      description="Search members, projects, companies, brands, spaces, and collab posts"
    >
      <CommandInput
        placeholder="Search or run a command..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length === 0 ? (
          <>
            {recent.length > 0 && (
              <CommandGroup heading="Recent">
                {recent.map((result) => {
                  const Icon = TYPE_ICON[result.type];
                  return (
                    <CommandItem
                      key={`recent-${result.type}-${result.id}`}
                      onSelect={() => selectResult(result)}
                    >
                      <History className="text-muted-foreground" />
                      <Icon />
                      <span>{result.title}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandGroup heading="Quick links">
              {QUICK_LINKS.map((link) => (
                <CommandItem key={link.href} onSelect={() => go(link.href)}>
                  <link.icon />
                  {link.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Commands">
              {CREATE_COMMANDS.map((cmd) => (
                <CommandItem key={cmd.title} onSelect={() => go(cmd.href)}>
                  <cmd.icon />
                  {cmd.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : (
          <>
            <CommandEmpty>
              {isPending ? "Searching..." : "No results found."}
            </CommandEmpty>
            {results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((result) => {
                  const Icon = TYPE_ICON[result.type];
                  return (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      onSelect={() => selectResult(result)}
                    >
                      <Icon />
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </>
        )}
        <CommandSeparator />
      </CommandList>
    </CommandDialog>
  );
}
