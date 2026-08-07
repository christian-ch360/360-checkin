import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
