import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FormState, UpdateFormField } from "../types";

export function FeaturedEventSection({ form, update }: { form: FormState; update: UpdateFormField }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="theme-featured-title">Featured Event Title</Label>
        <Input
          id="theme-featured-title"
          value={form.featuredEventTitle}
          onChange={(e) => update("featuredEventTitle", e.target.value)}
          placeholder="Holiday Creator Mixer"
        />
        <p className="text-xs text-muted-foreground">Date, time, and location come from Scheduling.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme-featured-tags">Event Tags (comma-separated)</Label>
        <Input
          id="theme-featured-tags"
          value={form.featuredEventTags}
          onChange={(e) => update("featuredEventTags", e.target.value)}
          placeholder="Free for Members, Costume Contest, Live DJ"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">QR Registration Button</p>
          <p className="text-xs text-muted-foreground">Shows a scannable QR code linking to the selected event&rsquo;s check-in/registration.</p>
        </div>
        <Switch checked={form.showQrRegistration} onCheckedChange={(v) => update("showQrRegistration", v)} disabled={!form.eventId} />
      </div>
    </div>
  );
}
