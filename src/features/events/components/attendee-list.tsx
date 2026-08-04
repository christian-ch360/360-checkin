"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { adminCheckInMemberToEvent } from "@/features/events/services/event-checkin-actions";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export type Attendee = {
  memberId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  checkedInAt: Date | null;
};

/** isManager gates the manual "Check in" action — adminCheckInMemberToEvent also enforces
 * events.manage server-side, but hiding the control avoids offering an action that will just
 * be rejected. */
export function AttendeeList({
  attendees,
  eventId,
  isManager = false,
}: {
  attendees: Attendee[];
  eventId: string;
  isManager?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCheckIn(memberId: string) {
    startTransition(async () => {
      const result = await adminCheckInMemberToEvent(eventId, memberId);
      if (result.outcome !== "checked_in") {
        toast.error(result.outcome === "already_checked_in" ? "Already checked in." : "Couldn't check them in.");
        return;
      }
      toast.success("Checked in");
      router.refresh();
    });
  }

  if (attendees.length === 0) {
    return <p className="text-sm text-muted-foreground">No one has RSVP&apos;d yet.</p>;
  }

  return (
    <div className="space-y-2">
      {attendees.map((a) => (
        <div key={a.memberId} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              {a.profilePhotoUrl && <AvatarImage src={a.profilePhotoUrl} alt={a.fullName} />}
              <AvatarFallback className="text-[10px]">{initials(a.fullName)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{a.fullName}</span>
          </div>
          {a.checkedInAt ? (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="size-3.5" /> Checked in
            </span>
          ) : (
            isManager && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                disabled={isPending}
                onClick={() => handleCheckIn(a.memberId)}
              >
                {isPending && <Loader2 className="size-3 animate-spin" />}
                Check in
              </Button>
            )
          )}
        </div>
      ))}
    </div>
  );
}
