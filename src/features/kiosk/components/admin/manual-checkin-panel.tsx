"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, LogIn, LogOut, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  searchMembersForManualCheckin,
  manualCheckIn,
  type ManualCheckinSearchResult,
} from "@/features/checkin/services/actions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function ManualCheckinPanel() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ManualCheckinSearchResult[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [isActing, startAction] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      startSearch(async () => {
        setResults(await searchMembersForManualCheckin(query));
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleToggle(memberId: string) {
    setActingId(memberId);
    startAction(async () => {
      const result = await manualCheckIn(memberId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(result.action === "checked_in" ? "Checked in" : "Checked out");
        const isCheckedIn = result.action === "checked_in";
        setResults((prev) => prev.map((m) => (m.id === memberId ? { ...m, isCheckedIn } : m)));
      }
      router.refresh();
      setActingId(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or member #..."
          className="h-11 pl-8"
        />
        {isSearching && <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {results.length === 0 && query.trim().length > 0 && !isSearching && (
        <p className="py-4 text-center text-sm text-muted-foreground">No members found.</p>
      )}

      <div className="divide-y">
        {results.map((m) => (
          <div key={m.id} className="flex items-center gap-3 py-2.5">
            <Avatar className="size-8">
              {m.profilePhotoUrl && <AvatarImage src={m.profilePhotoUrl} alt={m.fullName} />}
              <AvatarFallback className="text-xs">{initials(m.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.fullName}</p>
              <p className="text-xs text-muted-foreground">{m.memberNumber}</p>
            </div>
            <Button
              size="sm"
              variant={m.isCheckedIn ? "outline" : "default"}
              disabled={isActing && actingId === m.id}
              onClick={() => handleToggle(m.id)}
            >
              {m.isCheckedIn ? <LogOut /> : <LogIn />}
              {m.isCheckedIn ? "Check out" : "Check in"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
