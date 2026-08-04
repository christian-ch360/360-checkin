"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, Loader2, Users2, ChevronDown } from "lucide-react";
import { bookSpace } from "@/features/spaces/services/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TIME_SLOTS = Array.from({ length: (22 - 7) * 4 + 1 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const date = new Date(2000, 0, 1, hours, minutes);
  return { value, label: format(date, "h:mm a") };
});

export function BookSpaceForm({
  spaceId,
  projects,
  members,
  onBooked,
}: {
  spaceId: string;
  projects: { id: string; name: string }[];
  members: { id: string; fullName: string }[];
  onBooked: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState<Date>(new Date());
  const [startValue, setStartValue] = useState("09:00");
  const [endValue, setEndValue] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  function combine(dateValue: Date, time: string) {
    const [h, m] = time.split(":").map(Number);
    const combined = new Date(dateValue);
    combined.setHours(h, m, 0, 0);
    return combined;
  }

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  function submit() {
    const startTime = combine(date, startValue);
    const endTime = combine(date, endValue);

    startTransition(async () => {
      const result = await bookSpace({
        spaceId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: notes || undefined,
        projectId: projectId || undefined,
        attendeeIds: attendeeIds.length ? attendeeIds : undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Space booked");
      setNotes("");
      setProjectId("");
      setAttendeeIds([]);
      onBooked();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <p className="text-sm font-medium">Book this space</p>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-full justify-start font-normal")}>
            <CalendarIcon className="size-3.5" />
            {format(date, "EEEE, MMM d")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) setDate(d);
              setOpen(false);
            }}
            disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
          />
        </PopoverContent>
      </Popover>

      <div className="grid grid-cols-2 gap-2">
        <Select value={startValue} onValueChange={setStartValue}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((slot) => (
              <SelectItem key={slot.value} value={slot.value}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={endValue} onValueChange={setEndValue}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((slot) => (
              <SelectItem key={slot.value} value={slot.value}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Select value={projectId || undefined} onValueChange={setProjectId}>
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder="No project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={attendeesOpen} onOpenChange={setAttendeesOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between font-normal">
            <span className="flex items-center gap-1.5">
              <Users2 className="size-3.5" />
              {attendeeIds.length === 0
                ? "Add attendees"
                : `${attendeeIds.length} attendee${attendeeIds.length > 1 ? "s" : ""}`}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-h-64 w-64 overflow-y-auto p-2" align="start">
          {members.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No members found.</p>
          ) : (
            <div className="space-y-0.5">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={attendeeIds.includes(m.id)}
                    onCheckedChange={() => toggleAttendee(m.id)}
                  />
                  <span className="truncate">{m.fullName}</span>
                </label>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="resize-none text-sm"
      />

      <Button size="sm" className="w-full" onClick={submit} disabled={isPending}>
        {isPending && <Loader2 className="size-3.5 animate-spin" />}
        Confirm booking
      </Button>
    </div>
  );
}
