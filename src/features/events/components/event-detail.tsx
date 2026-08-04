import Link from "next/link";
import { format } from "date-fns";
import {
  PartyPopper,
  MapPin,
  Users,
  CalendarClock,
  UserCircle2,
  Globe,
  Video,
  Utensils,
  Car,
  Shirt,
  Wrench,
  QrCode,
  CalendarPlus,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RsvpButtonGroup } from "@/features/events/components/rsvp-button-group";
import { AttendeeList } from "@/features/events/components/attendee-list";
import { EVENT_CATEGORY_META } from "@/features/events/config/event-categories";
import type { RsvpStatus, EventCategory } from "@prisma/client";

export type EventDetailData = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  capacity: number | null;
  category: EventCategory;
  hostName: string | null;
  hostContact: string | null;
  website: string | null;
  livestreamUrl: string | null;
  dressCode: string | null;
  parkingInfo: string | null;
  foodProvided: boolean;
  equipmentNeeded: string[];
  registrationDeadline: Date | null;
  sponsors: unknown;
  space: { id: string; name: string } | null;
  createdBy: { id: string; fullName: string };
  rsvps: { status: RsvpStatus; member: { id: string; fullName: string; profilePhotoUrl: string | null } }[];
  checkIns: { memberId: string; checkedInAt: Date }[];
  qrAsset: { token: string } | null;
};

function googleCalendarUrl(event: EventDetailData) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${fmt(event.startTime)}/${fmt(event.endTime)}`,
    details: event.description ?? "",
    location: event.location ?? event.space?.name ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

type Sponsor = { name: string; logoUrl?: string; message?: string; ctaLabel?: string; ctaLink?: string };

export function EventDetail({
  event,
  currentMemberId,
  isManager = false,
}: {
  event: EventDetailData;
  currentMemberId: string;
  isManager?: boolean;
}) {
  const place = event.location ?? event.space?.name ?? null;
  const going = event.rsvps.filter((r) => r.status === "GOING");
  const waitlisted = event.rsvps.filter((r) => r.status === "WAITLISTED");
  const checkedInAtByMember = new Map(event.checkIns.map((c) => [c.memberId, c.checkedInAt]));
  const myRsvp = event.rsvps.find((r) => r.member.id === currentMemberId)?.status ?? null;
  const categoryMeta = EVENT_CATEGORY_META[event.category];
  const CategoryIcon = categoryMeta.icon;
  const sponsors = Array.isArray(event.sponsors) ? (event.sponsors as Sponsor[]) : [];
  const spotsRemaining = event.capacity ? Math.max(0, event.capacity - going.length) : null;

  return (
    <div className="space-y-6">
      <div className="relative flex flex-col justify-end gap-3 overflow-hidden rounded-2xl border bg-primary/5 p-6 text-primary sm:h-56">
        <PartyPopper className="pointer-events-none absolute -right-4 -bottom-4 size-32 opacity-10" />
        <Badge variant="outline" className={`w-fit gap-1.5 ${categoryMeta.badgeClass}`}>
          <CategoryIcon className="size-3" /> {categoryMeta.label}
        </Badge>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{event.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground/80">
            <CalendarClock className="size-3.5" />
            {format(event.startTime, "EEE, MMM d · h:mm a")} – {format(event.endTime, "h:mm a")}
          </p>
        </div>
        {place && (
          <p className="flex items-center gap-1.5 text-sm text-foreground/80">
            <MapPin className="size-3.5" /> {place}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {event.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About this event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {event.hostName && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <UserCircle2 className="size-4 shrink-0" /> Hosted by {event.hostName}
                </p>
              )}
              {event.dressCode && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Shirt className="size-4 shrink-0" /> {event.dressCode}
                </p>
              )}
              {event.foodProvided && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Utensils className="size-4 shrink-0" /> Food provided
                </p>
              )}
              {event.parkingInfo && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Car className="size-4 shrink-0" /> {event.parkingInfo}
                </p>
              )}
              {event.equipmentNeeded.length > 0 && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Wrench className="size-4 shrink-0" /> {event.equipmentNeeded.join(", ")}
                </p>
              )}
              {event.website && (
                <a
                  href={event.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Globe className="size-4 shrink-0" /> Event website
                </a>
              )}
              {event.livestreamUrl && (
                <a
                  href={event.livestreamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Video className="size-4 shrink-0" /> Livestream link
                </a>
              )}
            </CardContent>
          </Card>

          {sponsors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sponsors</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {sponsors.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    {s.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary logo URLs
                      <img src={s.logoUrl} alt={s.name} className="size-6 rounded object-contain" />
                    )}
                    <span className="font-medium">{s.name}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {event.space && (
            <p className="text-sm text-muted-foreground">
              Hosted in{" "}
              <Link href={`/spaces/${event.space.id}`} className="font-medium text-primary hover:underline">
                {event.space.name}
              </Link>
            </p>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">RSVP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RsvpButtonGroup eventId={event.id} currentStatus={myRsvp} />
              {myRsvp === "GOING" && (
                <div className="flex flex-col gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" asChild>
                    <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
                      <CalendarPlus className="size-3.5" /> Add to calendar
                    </a>
                  </Button>
                  {event.qrAsset && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/qr/${event.qrAsset.token}`} download={`${event.title}-ticket.png`}>
                        <QrCode className="size-3.5" /> Download ticket QR
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Capacity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registered</span>
                <span className="font-medium tabular-nums">
                  {going.length}
                  {event.capacity ? ` / ${event.capacity}` : ""}
                </span>
              </div>
              {event.capacity && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Spots remaining</span>
                  <span className="font-medium tabular-nums">{spotsRemaining}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="size-3.5" /> Checked in
                </span>
                <span className="font-medium tabular-nums">{event.checkIns.length}</span>
              </div>
              {waitlisted.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Waitlisted</span>
                  <span className="font-medium tabular-nums">{waitlisted.length}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                <Users className="size-4" /> Going ({going.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendeeList
                eventId={event.id}
                isManager={isManager}
                attendees={going.map((r) => ({
                  memberId: r.member.id,
                  fullName: r.member.fullName,
                  profilePhotoUrl: r.member.profilePhotoUrl,
                  checkedInAt: checkedInAtByMember.get(r.member.id) ?? null,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
