"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { Square } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { endSpaceSessionAction } from "@/features/spaces/services/actions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function ActiveSessionCard({
  session,
}: {
  session: {
    id: string;
    startedAt: Date;
    member: { fullName: string; profilePhotoUrl: string | null };
    project: { name: string } | null;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function endSession() {
    startTransition(async () => {
      const result = await endSpaceSessionAction(session.id);
      if (!result.success) toast.error(result.error);
      else toast.success(`Session ended${result.durationMin ? ` · ${result.durationMin} min` : ""}`);
      router.refresh();
    });
  }

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar className="size-10">
          {session.member.profilePhotoUrl && <AvatarImage src={session.member.profilePhotoUrl} />}
          <AvatarFallback>{initials(session.member.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{session.member.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {session.project ? `${session.project.name} · ` : ""}
            Started {formatDistanceToNowStrict(session.startedAt, { addSuffix: true })}
          </p>
        </div>
        <Button size="sm" variant="destructive" onClick={endSession} disabled={isPending}>
          <Square className="size-3.5" /> End session
        </Button>
      </CardContent>
    </Card>
  );
}
