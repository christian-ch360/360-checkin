"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addCampaignCreator, removeCampaignCreator } from "@/features/agencies/services/campaign-actions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type Creator = { id: string; fullName: string; profilePhotoUrl: string | null };

export function CampaignCreatorsPanel({
  campaignId,
  assigned,
  available,
  canManage,
}: {
  campaignId: string;
  assigned: Creator[];
  available: Creator[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");

  const unassigned = available.filter((c) => !assigned.some((a) => a.id === c.id));

  function add() {
    if (!selected) return;
    startTransition(async () => {
      const result = await addCampaignCreator(campaignId, selected);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSelected("");
      router.refresh();
    });
  }

  function remove(creatorId: string) {
    startTransition(async () => {
      const result = await removeCampaignCreator(campaignId, creatorId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {assigned.length === 0 ? (
        <p className="text-sm text-muted-foreground">No creators assigned yet.</p>
      ) : (
        <ul className="space-y-2">
          {assigned.map((creator) => (
            <li key={creator.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
              <Link href={`/members/${creator.id}`} className="flex items-center gap-2.5">
                <Avatar className="size-7">
                  {creator.profilePhotoUrl && <AvatarImage src={creator.profilePhotoUrl} alt={creator.fullName} />}
                  <AvatarFallback className="text-xs">{initials(creator.fullName)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{creator.fullName}</span>
              </Link>
              {canManage && (
                <button
                  type="button"
                  onClick={() => remove(creator.id)}
                  disabled={isPending}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label={`Remove ${creator.fullName}`}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && unassigned.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selected || undefined} onValueChange={setSelected}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add a creator" />
            </SelectTrigger>
            <SelectContent>
              {unassigned.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!selected || isPending} onClick={add}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
