"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, HelpCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { rsvpToEvent } from "@/features/events/services/event-actions";
import type { RsvpStatus } from "@prisma/client";

const OPTIONS: { status: RsvpStatus; label: string; icon: typeof Check }[] = [
  { status: "GOING", label: "Going", icon: Check },
  { status: "MAYBE", label: "Maybe", icon: HelpCircle },
  { status: "NOT_GOING", label: "Not going", icon: X },
];

const RESULT_MESSAGE: Record<string, string> = {
  GOING: "You're marked as going",
  MAYBE: "You're marked as maybe",
  NOT_GOING: "You're marked as not going",
  WAITLISTED: "This event is full — you've been added to the waitlist",
};

export function RsvpButtonGroup({
  eventId,
  currentStatus,
}: {
  eventId: string;
  currentStatus: RsvpStatus | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRsvp(status: RsvpStatus) {
    startTransition(async () => {
      const result = await rsvpToEvent(eventId, status);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(RESULT_MESSAGE[result.status ?? status]);
      router.refresh();
    });
  }

  if (currentStatus === "WAITLISTED") {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
        You&apos;re on the waitlist — we&apos;ll email you if a spot opens up.
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = currentStatus === option.status;
        return (
          <Button
            key={option.status}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            className={cn("flex-1", active && option.status === "GOING" && "bg-emerald-600 hover:bg-emerald-700")}
            disabled={isPending}
            onClick={() => handleRsvp(option.status)}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
