import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { FormState, UpdateFormField } from "../types";

export function BasicInfoSection({
  form,
  update,
  events,
}: {
  form: FormState;
  update: UpdateFormField;
  events: { id: string; title: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="theme-name">Theme Name</Label>
        <Input id="theme-name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Whiskey Wednesday" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme-headline">Hero Title</Label>
        <Input id="theme-headline" value={form.headline} onChange={(e) => update("headline", e.target.value)} placeholder="🥃 Whiskey Wednesday" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme-kiosk-title">Kiosk Title (optional)</Label>
        <Input
          id="theme-kiosk-title"
          value={form.kioskTitle}
          onChange={(e) => update("kioskTitle", e.target.value)}
          placeholder="KIOSK CHECK-IN"
        />
        <p className="text-xs text-muted-foreground">
          A dedicated third heading, shown below Hero Title as the interface&rsquo;s main title — e.g. for a
          brand-fronted theme where Hero Title carries the wordmark. Leave blank to keep the current two-line
          Hero Title / Hero Subtitle layout.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme-subheadline">Hero Subtitle</Label>
        <Textarea id="theme-subheadline" rows={2} value={form.subheadline} onChange={(e) => update("subheadline", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme-location">Location</Label>
        <Input id="theme-location" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Main Lounge" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme-parking-info">Parking Info</Label>
        <Input
          id="theme-parking-info"
          value={form.parkingInfo}
          onChange={(e) => update("parkingInfo", e.target.value)}
          placeholder="Uber Preferred, Valet and Street Parking available"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme-checkin-message">Check-In Message</Label>
        <Textarea
          id="theme-checkin-message"
          rows={2}
          value={form.checkInMessage}
          onChange={(e) => update("checkInMessage", e.target.value)}
          placeholder="Thank you for being part of this special experience."
        />
        <p className="text-xs text-muted-foreground">
          Shown beneath the Check In / Register buttons, and as the Success screen&rsquo;s closing line. Leave blank to
          keep the default copy.
        </p>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Themed Action Buttons</p>
          <p className="text-xs text-muted-foreground">
            Lets this theme&rsquo;s Button Color recolor the Check In / Register cards below the hero, which
            otherwise stay a neutral white regardless of theme.
          </p>
        </div>
        <Switch checked={form.themedActionButtons} onCheckedChange={(v) => update("themedActionButtons", v)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="theme-cta-label">Button Label</Label>
          <Input id="theme-cta-label" value={form.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} placeholder="Reserve Your Spot" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-cta-link">Button Link</Label>
          <Input id="theme-cta-link" value={form.ctaLink} onChange={(e) => update("ctaLink", e.target.value)} />
        </div>
      </div>
      {events.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="theme-event">Use Event as Kiosk Theme (optional)</Label>
          <Select value={form.eventId || "none"} onValueChange={(v) => update("eventId", v === "none" ? "" : v)}>
            <SelectTrigger id="theme-event">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None — use the fields above</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            When linked, the kiosk reads the title, description, date, location, and banner live from the event —
            no duplicate entry required.
          </p>
        </div>
      )}
    </div>
  );
}
