"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LiveDuration } from "@/features/checkin/components/live-duration";
import { manualCheckIn } from "@/features/checkin/services/actions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function OccupancyList({
  members,
}: {
  members: {
    id: string;
    memberId: string;
    fullName: string;
    memberNumber: string;
    profilePhotoUrl: string | null;
    checkIn: Date;
  }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function checkout(memberId: string) {
    startTransition(async () => {
      const result = await manualCheckIn(memberId);
      if ("error" in result) toast.error(result.error);
      else toast.success("Checked out");
      router.refresh();
    });
  }

  if (members.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nobody is currently checked in.</p>;
  }

  return (
    <div className="divide-y">
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 py-2.5">
          <div className="relative shrink-0">
            <Avatar className="size-9">
              {m.profilePhotoUrl && <AvatarImage src={m.profilePhotoUrl} alt={m.fullName} />}
              <AvatarFallback className="text-xs">{initials(m.fullName)}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">🟢 {m.fullName}</p>
            <p className="text-xs text-muted-foreground">
              Checked in <LiveDuration since={m.checkIn} /> ago
            </p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => checkout(m.memberId)}
            aria-label={`Check out ${m.fullName}`}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
