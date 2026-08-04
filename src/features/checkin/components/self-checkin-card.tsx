"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { selfCheckInByToken } from "@/features/checkin/services/public-actions";
import { formatDuration } from "@/lib/utils/format";

export function SelfCheckinCard({
  token,
  memberName,
  isCurrentlyIn,
}: {
  token: string;
  memberName: string;
  isCurrentlyIn: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { action: "checked_in" } | { action: "checked_out"; durationMinutes: number } | null
  >(null);

  function handleClick() {
    startTransition(async () => {
      const res = await selfCheckInByToken(token);
      if (!("error" in res)) setResult(res);
    });
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="size-10 text-emerald-500" />
        <p className="font-medium">
          {result.action === "checked_in" ? "You're checked in!" : "You're checked out."}
        </p>
        {result.action === "checked_out" && (
          <p className="text-sm text-muted-foreground">{formatDuration(result.durationMinutes)} logged</p>
        )}
      </div>
    );
  }

  return (
    <Button onClick={handleClick} disabled={isPending} size="lg" className="w-full">
      {isCurrentlyIn ? <LogOut /> : <LogIn />}
      {isCurrentlyIn ? `Check out ${memberName}` : `Check in ${memberName}`}
    </Button>
  );
}
