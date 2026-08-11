"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { suspendMemberFromPosting } from "@/features/community/services/community-moderation-actions";

type Candidate = { id: string; fullName: string; profilePhotoUrl: string | null; memberNumber: string };

/** Compact "suspend a member from posting" control — search by name, pick, add an optional reason. */
export function SuspendMemberControl() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/direct-messages/search?q=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  async function suspend() {
    if (!selected) return;
    setBusy(true);
    const result = await suspendMemberFromPosting(selected.id, reason.trim() || undefined);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${selected.fullName} suspended from posting`);
    setSelected(null);
    setQuery("");
    setReason("");
  }

  if (selected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="size-6">
            {selected.profilePhotoUrl && <AvatarImage src={selected.profilePhotoUrl} />}
            <AvatarFallback className="text-[10px]">{selected.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {selected.fullName}
          <button onClick={() => setSelected(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            Change
          </button>
        </div>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" rows={2} />
        <Button size="sm" variant="destructive" onClick={suspend} disabled={busy} className="w-full">
          <UserX className="size-3.5" /> Suspend from posting
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a member…" className="h-8 text-sm" />
      {results.length > 0 && (
        <div className="space-y-0.5">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted"
            >
              <Avatar className="size-5">
                {r.profilePhotoUrl && <AvatarImage src={r.profilePhotoUrl} />}
                <AvatarFallback className="text-[9px]">{r.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {r.fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
