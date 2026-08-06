import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { KioskLogoVariant } from "@prisma/client";
import type { FormState, UpdateFormField } from "../types";

export function BrandingSection({ form, update }: { form: FormState; update: UpdateFormField }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="theme-bg">Background Image URL</Label>
        <Input id="theme-bg" value={form.backgroundImageUrl} onChange={(e) => update("backgroundImageUrl", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme-bg-video">Background Video URL (optional)</Label>
        <Input id="theme-bg-video" value={form.backgroundVideoUrl} onChange={(e) => update("backgroundVideoUrl", e.target.value)} />
        <p className="text-xs text-muted-foreground">Plays muted &amp; looping behind the hero; the background image is used as its poster frame.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="theme-logo-variant">Logo Variant</Label>
          <Select value={form.logoVariant} onValueChange={(v) => update("logoVariant", v as KioskLogoVariant)}>
            <SelectTrigger id="theme-logo-variant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEFAULT">Default (none in hero)</SelectItem>
              <SelectItem value="LIGHT">Light mark</SelectItem>
              <SelectItem value="DARK">Dark mark</SelectItem>
              <SelectItem value="HIDDEN">Hidden</SelectItem>
              <SelectItem value="CUSTOM">Custom image</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.logoVariant === "CUSTOM" && (
          <div className="space-y-2">
            <Label htmlFor="theme-logo">Logo Override URL</Label>
            <Input id="theme-logo" value={form.logoOverrideUrl} onChange={(e) => update("logoOverrideUrl", e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}
