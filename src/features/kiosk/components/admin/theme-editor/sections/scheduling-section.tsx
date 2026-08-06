import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { KioskRecurrence } from "@prisma/client";
import type { EditableThemeVersion, FormState, UpdateFormField } from "../types";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function SchedulingSection({
  form,
  update,
  themeKey,
  latest,
  isPending,
  onTogglePinnedLive,
}: {
  form: FormState;
  update: UpdateFormField;
  themeKey?: string;
  latest?: EditableThemeVersion | null;
  isPending: boolean;
  onTogglePinnedLive: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="theme-start-date">Theme Start Date</Label>
          <Input id="theme-start-date" type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-end-date">Theme End Date</Label>
          <Input id="theme-end-date" type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-start-time">Start Time (optional)</Label>
          <Input id="theme-start-time" type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-end-time">End Time (optional)</Label>
          <Input id="theme-end-time" type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme-recurrence">Recurrence</Label>
        <Select value={form.recurrence} onValueChange={(v) => update("recurrence", v as KioskRecurrence)}>
          <SelectTrigger id="theme-recurrence">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">One-time (date range only)</SelectItem>
            <SelectItem value="WEEKLY">Every week, on selected days</SelectItem>
            <SelectItem value="MONTHLY_NTH_WEEKDAY">Nth weekday of the month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.recurrence === "WEEKLY" && (
        <div className="space-y-2">
          <Label>Days of Week</Label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d) => {
              const active = form.recurrenceDaysOfWeek.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() =>
                    update(
                      "recurrenceDaysOfWeek",
                      active ? form.recurrenceDaysOfWeek.filter((v) => v !== d.value) : [...form.recurrenceDaysOfWeek, d.value]
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Example: every Wednesday → Whiskey Wednesday.</p>
        </div>
      )}

      {form.recurrence === "MONTHLY_NTH_WEEKDAY" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="theme-nth-week">Occurrence</Label>
            <Select value={form.recurrenceNthWeek || "1"} onValueChange={(v) => update("recurrenceNthWeek", v)}>
              <SelectTrigger id="theme-nth-week">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">First</SelectItem>
                <SelectItem value="2">Second</SelectItem>
                <SelectItem value="3">Third</SelectItem>
                <SelectItem value="4">Fourth</SelectItem>
                <SelectItem value="5">Last</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme-nth-weekday">Weekday</Label>
            <Select value={form.recurrenceWeekday || "1"} onValueChange={(v) => update("recurrenceWeekday", v)}>
              <SelectTrigger id="theme-nth-weekday">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">Example: First Monday → Investor Pitch Day.</p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Countdown Timer</p>
          <p className="text-xs text-muted-foreground">Counts down to the start date/time on the kiosk hero.</p>
        </div>
        <Switch checked={form.showCountdown} onCheckedChange={(v) => update("showCountdown", v)} />
      </div>

      {latest && themeKey && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Manual Override</p>
            <p className="text-xs text-muted-foreground">
              {latest.isPinnedLive
                ? "This theme is pinned live right now, overriding the automatic schedule."
                : latest.status === "PUBLISHED"
                  ? "Force this theme live immediately, regardless of schedule."
                  : "Publish this theme first to enable manual override."}
            </p>
          </div>
          <Button
            size="sm"
            variant={latest.isPinnedLive ? "default" : "outline"}
            onClick={onTogglePinnedLive}
            disabled={isPending || latest.status !== "PUBLISHED"}
          >
            {latest.isPinnedLive ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            {latest.isPinnedLive ? "Unpin" : "Force Live"}
          </Button>
        </div>
      )}
    </div>
  );
}
