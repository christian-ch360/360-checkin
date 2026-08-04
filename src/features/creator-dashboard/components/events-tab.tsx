import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import type { RsvpStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

type EventRow = {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: string | null;
  rsvpStatus: RsvpStatus;
};

const RSVP_LABEL: Record<RsvpStatus, string> = {
  GOING: "Going",
  MAYBE: "Maybe",
  NOT_GOING: "Not going",
  WAITLISTED: "Waitlisted",
};

function EventGroup({ title, events }: { title: string; events: EventRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Card key={`${title}-${e.id}`}>
              <CardContent className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(e.startTime, "MMM d, h:mm a")}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {RSVP_LABEL[e.rsvpStatus]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventsTab({
  events,
}: {
  events: { upcoming: EventRow[]; attending: EventRow[]; past: EventRow[] };
}) {
  if (events.upcoming.length === 0 && events.past.length === 0) {
    return <EmptyState icon={CalendarDays} title="No events yet" description="RSVP to an event to see it here." />;
  }

  return (
    <div className="space-y-6">
      <EventGroup title="Upcoming" events={events.upcoming} />
      <EventGroup title="Attending" events={events.attending} />
      <EventGroup title="Past" events={events.past} />
    </div>
  );
}
