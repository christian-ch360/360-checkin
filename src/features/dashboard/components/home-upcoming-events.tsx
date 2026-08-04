import Link from "next/link";
import { format } from "date-fns";
import { PartyPopper, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Wired up in Sprint 6 (the only sprint in this initiative allowed to touch
// the schema) — data comes from listUpcomingEvents.
export type HomeUpcomingEvent = { id: string; title: string; startTime: Date };

export function HomeUpcomingEvents({ events }: { events: HomeUpcomingEvent[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Upcoming events</CardTitle>
        <Link href="/events" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View all <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <PartyPopper className="size-4" /> No events scheduled yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg p-1.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="truncate">{event.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{format(event.startTime, "MMM d")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
