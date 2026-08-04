import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type HomeNextBooking = { spaceId: string; spaceName: string; startTime: Date } | null;

export function HomeNextBooking({ booking }: { booking: HomeNextBooking }) {
  return (
    <Link href={booking ? `/spaces/${booking.spaceId}` : "/spaces"} className="block h-full">
      <Card className="card-interactive h-full hover:bg-muted/50">
        <CardContent className="flex h-full items-center gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            {booking ? (
              <>
                <p className="truncate text-sm font-medium">{booking.spaceName}</p>
                <p className="text-xs text-muted-foreground">{format(booking.startTime, "MMM d, h:mm a")}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">No upcoming bookings</p>
                <p className="text-xs text-muted-foreground">Browse spaces</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
