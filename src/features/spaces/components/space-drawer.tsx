"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Users, CalendarClock, QrCode, CalendarDays, Loader2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { SPACE_TYPE_META } from "@/features/spaces/components/space-card";
import { SpaceStatusBadge } from "@/features/spaces/components/space-status-badge";
import { BookSpaceForm } from "@/features/spaces/components/book-space-form";
import { QRScanner } from "@/features/qr/components/qr-scanner";
import { cancelReservation } from "@/features/spaces/services/actions";
import type { SpaceDashboardItem } from "@/features/spaces/services/spaces.service";

type ReservationLike = {
  id: string;
  memberId: string;
  memberName: string;
  projectName: string | null;
  attendeeNames: string[];
  startTime: Date;
  endTime: Date;
  isCurrent?: boolean;
};

function ReservationRow({
  reservation,
  canCancel,
}: {
  reservation: ReservationLike;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onCancel() {
    startTransition(async () => {
      const result = await cancelReservation(reservation.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Reservation cancelled");
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        reservation.isCurrent ? "border-sky-500/30 bg-sky-500/5" : "bg-muted/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{reservation.memberName}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(reservation.startTime, "h:mm a")} – {format(reservation.endTime, "h:mm a")}
          </span>
          {canCancel && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-destructive"
              disabled={isPending}
              onClick={onCancel}
              aria-label="Cancel reservation"
            >
              {isPending ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
            </Button>
          )}
        </div>
      </div>
      {(reservation.projectName || reservation.attendeeNames.length > 0) && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {reservation.projectName}
          {reservation.projectName && reservation.attendeeNames.length > 0 ? " · " : ""}
          {reservation.attendeeNames.length > 0 && `+${reservation.attendeeNames.length} attendee${reservation.attendeeNames.length > 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  );
}

export function SpaceDrawer({
  space,
  open,
  onOpenChange,
  onBooked,
  initialBooking = false,
  projects,
  members,
  currentActorId,
  canManage,
}: {
  space: SpaceDashboardItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked: () => void;
  initialBooking?: boolean;
  projects: { id: string; name: string }[];
  members: { id: string; fullName: string }[];
  currentActorId: string;
  canManage: boolean;
}) {
  const [booking, setBooking] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setBooking(initialBooking);
      setCalendarDate(undefined);
    }
  }, [open, initialBooking]);

  const allReservations = useMemo(
    () => [...(space?.todayReservations ?? []), ...(space?.upcomingReservations ?? [])],
    [space]
  );

  const bookedDates = useMemo(() => allReservations.map((r) => r.startTime), [allReservations]);

  const selectedDayReservations = useMemo(() => {
    if (!calendarDate) return [];
    return allReservations.filter((r) => isSameDay(r.startTime, calendarDate));
  }, [allReservations, calendarDate]);

  if (!space) return null;
  const meta = SPACE_TYPE_META[space.type];
  const Icon = meta.icon;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setBooking(false);
      }}
    >
      <SheetContent
        side={isMobile === true ? "bottom" : "right"}
        className={isMobile === true ? "w-full gap-0 overflow-y-auto" : "w-full gap-0 overflow-y-auto sm:max-w-md"}
      >
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">{space.name}</SheetTitle>
              <p className="text-xs text-muted-foreground">{meta.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <SpaceStatusBadge status={space.status} />
            {space.capacity && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3" /> {space.capacity}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {(space.status === "OCCUPIED" && space.activeSession) ||
          (space.status === "RESERVED" && space.currentReservation) ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Current reservation
              </p>
              {space.status === "OCCUPIED" && space.activeSession ? (
                <>
                  <p className="text-sm font-medium">{space.activeSession.memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {space.activeSession.projectName ? `${space.activeSession.projectName} · ` : ""}
                    In progress since {format(space.activeSession.startedAt, "h:mm a")}
                  </p>
                </>
              ) : (
                space.currentReservation && (
                  <>
                    <p className="text-sm font-medium">{space.currentReservation.memberName}</p>
                    <p className="text-xs text-muted-foreground">
                      {space.currentReservation.projectName ? `${space.currentReservation.projectName} · ` : ""}
                      Until {format(space.currentReservation.endTime, "h:mm a")}
                    </p>
                  </>
                )
              )}
            </div>
          ) : null}

          {space.equipment.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Equipment</p>
              <div className="flex flex-wrap gap-1.5">
                {space.equipment.map((item) => (
                  <Badge key={item} variant="outline" className="font-normal">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="size-3.5" /> Today&apos;s reservations
            </p>
            {space.todayReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reservations today.</p>
            ) : (
              <div className="space-y-1.5">
                {space.todayReservations.map((r) => (
                  <ReservationRow key={r.id} reservation={r} canCancel={r.memberId === currentActorId || canManage} />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Upcoming reservations
            </p>
            {space.upcomingReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing booked ahead.</p>
            ) : (
              <div className="space-y-1.5">
                {space.upcomingReservations.slice(0, 5).map((r) => (
                  <ReservationRow key={r.id} reservation={r} canCancel={r.memberId === currentActorId || canManage} />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="size-3.5" /> Calendar
            </p>
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={setCalendarDate}
              modifiers={{ booked: bookedDates }}
              modifiersClassNames={{ booked: "bg-primary/10 text-primary font-semibold" }}
              className="w-full rounded-lg border p-2"
            />
            {calendarDate && (
              <div className="mt-2 space-y-1.5">
                {selectedDayReservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reservations on {format(calendarDate, "MMM d")}.</p>
                ) : (
                  selectedDayReservations.map((r) => (
                    <ReservationRow key={r.id} reservation={r} canCancel={r.memberId === currentActorId || canManage} />
                  ))
                )}
              </div>
            )}
          </div>

          {booking ? (
            <BookSpaceForm
              spaceId={space.id}
              projects={projects}
              members={members}
              onBooked={() => {
                setBooking(false);
                onBooked();
              }}
            />
          ) : (
            <Button className="w-full" onClick={() => setBooking(true)}>
              Book Space
            </Button>
          )}

          <Separator />

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <QrCode className="size-3.5" /> QR Check-In
            </p>
            <QRScanner onScan={() => {}} successLabel="Space Check In Successful" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
