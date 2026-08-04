"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, LogIn, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkInSelfToEventByToken } from "@/features/events/services/event-checkin-actions";

export function EventSelfCheckinCard({
  token,
  eventTitle,
  isSignedIn,
}: {
  token: string;
  eventTitle: string;
  isSignedIn: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<"checked_in" | "already_checked_in" | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await checkInSelfToEventByToken(token);
      if (result.outcome === "checked_in" || result.outcome === "already_checked_in") {
        setOutcome(result.outcome);
      }
    });
  }

  if (outcome) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="size-10 text-emerald-500" />
        <p className="font-medium">{outcome === "checked_in" ? "You're checked in!" : "You're already checked in."}</p>
        <p className="text-sm text-muted-foreground">{eventTitle}</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <QrCode className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Sign in to check in to {eventTitle}.</p>
        <Button asChild className="w-full">
          <Link href={`/login?redirect=/scan/${token}`}>
            <LogIn /> Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleClick} disabled={isPending} size="lg" className="w-full">
      <LogIn /> Check in to {eventTitle}
    </Button>
  );
}
