"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SquarePen, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startDirectConversation, createGroupConversation } from "@/features/messaging/services/conversation-actions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type SearchResult = { id: string; fullName: string; profilePhotoUrl: string | null; role: string; memberNumber: string };

export function NewConversationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState<SearchResult[]>([]);
  const [groupName, setGroupName] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/direct-messages/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  function reset() {
    setQuery("");
    setResults([]);
    setSelected([]);
    setGroupName("");
    setMode("direct");
  }

  async function pick(member: SearchResult) {
    if (mode === "direct") {
      setStarting(true);
      const result = await startDirectConversation(member.id);
      setStarting(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      reset();
      router.push(`/messages/dm_${result.conversationId}`);
      return;
    }

    if (selected.some((m) => m.id === member.id)) return;
    setSelected((prev) => [...prev, member]);
    setQuery("");
    setResults([]);
  }

  function removeSelected(memberId: string) {
    setSelected((prev) => prev.filter((m) => m.id !== memberId));
  }

  async function handleCreateGroup() {
    setStarting(true);
    const result = await createGroupConversation(
      selected.map((m) => m.id),
      groupName || undefined
    );
    setStarting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    reset();
    router.push(`/messages/dm_${result.conversationId}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="New message">
          <SquarePen className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader className="border-b p-4 pb-3">
          <DialogTitle>New message</DialogTitle>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "direct" | "group")} className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="direct" className="flex-1">
                Direct
              </TabsTrigger>
              <TabsTrigger value="group" className="flex-1">
                Group
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        {mode === "group" && (
          <div className="space-y-2 border-b p-3">
            <Input
              placeholder="Group name (optional)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((m) => (
                  <Badge key={m.id} variant="outline" className="gap-1 pr-1">
                    {m.fullName}
                    <button type="button" onClick={() => removeSelected(m.id)} aria-label={`Remove ${m.fullName}`}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search members or creators…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-full pl-9"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto px-2 pb-3">
          {loading && <p className="px-2 py-4 text-center text-sm text-muted-foreground">Searching…</p>}
          {!loading && query.trim() && results.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No members found.</p>
          )}
          {results
            .filter((m) => !selected.some((s) => s.id === m.id))
            .map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={starting}
                onClick={() => pick(m)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/60 disabled:opacity-50"
              >
                <Avatar className="size-9 shrink-0">
                  {m.profilePhotoUrl && <AvatarImage src={m.profilePhotoUrl} />}
                  <AvatarFallback className="text-xs">{initials(m.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.fullName}</p>
                  <p className="truncate text-xs capitalize text-muted-foreground">{m.role.toLowerCase()}</p>
                </div>
              </button>
            ))}
        </div>

        {mode === "group" && (
          <div className="border-t p-3">
            <Button className="w-full" disabled={selected.length < 2 || starting} onClick={handleCreateGroup}>
              Create group ({selected.length})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
