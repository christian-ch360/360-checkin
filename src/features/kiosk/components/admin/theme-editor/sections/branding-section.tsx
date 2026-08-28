import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { KioskLogoVariant } from "@prisma/client";
import { KIOSK_HERO_SIZE_RANGES } from "@/features/kiosk/config/kiosk-hero-sizing.config";
import { BackgroundImageUpload } from "../background-image-upload";
import { SizeSliderField } from "../size-slider-field";
import type { FormState, UpdateFormField } from "../types";

export function BrandingSection({ form, update, themeKey }: { form: FormState; update: UpdateFormField; themeKey?: string }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Background Image</Label>
        <BackgroundImageUpload themeKey={themeKey} value={form.backgroundImageUrl} onChange={(url) => update("backgroundImageUrl", url)} />
      </div>
      {form.backgroundImageUrl && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Background Overlay</p>
            <p className="text-xs text-muted-foreground">
              A dark wash over the background image, for light hero text on an arbitrary photo. Turn off for an
              image that&rsquo;s already light and meant to be the primary visual, like a soft floral background.
            </p>
          </div>
          <Switch checked={form.backgroundOverlay} onCheckedChange={(v) => update("backgroundOverlay", v)} />
        </div>
      )}
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

      {form.logoVariant !== "DEFAULT" && form.logoVariant !== "HIDDEN" && (
        <SizeSliderField
          id="theme-hero-logo-size"
          label="Hero Logo Size"
          value={form.heroLogoSize}
          min={KIOSK_HERO_SIZE_RANGES.logoSize.min}
          max={KIOSK_HERO_SIZE_RANGES.logoSize.max}
          onChange={(v) => update("heroLogoSize", v)}
        />
      )}
    </div>
  );
}
