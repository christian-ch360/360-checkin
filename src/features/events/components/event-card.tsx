import Link from "next/link";
import { format } from "date-fns";
import { PartyPopper, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type EventCardData = {
  id: string;
  title: string;
  startTime: Date;
  location: string | null;
  space: { name: string } | null;
  imageUrl: string | null;
  rsvps: { status: string }[];
};

export function EventCard({ event }: { event: EventCardData }) {
  const goingCount = event.rsvps.filter((r) => r.status === "GOING").length;
  const place = event.location ?? event.space?.name ?? null;

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border bg-primary/5 text-primary">
        <PartyPopper className="size-10 opacity-80" />
      </div>

      <div>
        <p className="font-medium">{event.title}</p>
        <p className="text-xs text-muted-foreground">{format(event.startTime, "EEE, MMM d · h:mm a")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {place && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" /> {place}
          </span>
        )}
        {goingCount > 0 && (
          <Badge variant="secondary" className="inline-flex items-center gap-1 text-[10px] font-normal">
            <Users className="size-3" /> {goingCount} going
          </Badge>
        )}
      </div>
    </Link>
  );
}
