import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { KioskButtonStyle } from "@prisma/client";
import type { FormState, UpdateFormField } from "../types";

export function ColorsSection({ form, update }: { form: FormState; update: UpdateFormField }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="theme-primary">Primary Color</Label>
          <Input id="theme-primary" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} placeholder="#1b4332" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-secondary">Secondary Color</Label>
          <Input id="theme-secondary" value={form.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} placeholder="#d4af37" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-accent">Accent Color</Label>
          <Input id="theme-accent" value={form.accentColor} onChange={(e) => update("accentColor", e.target.value)} placeholder="#b91c1c" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-button-color">Button Color</Label>
          <Input id="theme-button-color" value={form.buttonColor} onChange={(e) => update("buttonColor", e.target.value)} placeholder="#b45309" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-button-text-color">Button Text Color</Label>
          <Input id="theme-button-text-color" value={form.buttonTextColor} onChange={(e) => update("buttonTextColor", e.target.value)} placeholder="#ffffff" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-text-color">Text Color</Label>
          <Input id="theme-text-color" value={form.textColor} onChange={(e) => update("textColor", e.target.value)} placeholder="#000000" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme-button-style">Button Style</Label>
        <Select value={form.buttonStyle} onValueChange={(v) => update("buttonStyle", v as KioskButtonStyle)}>
          <SelectTrigger id="theme-button-style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SOLID">Solid</SelectItem>
            <SelectItem value="OUTLINE">Outline</SelectItem>
            <SelectItem value="GLASS">Glass</SelectItem>
            <SelectItem value="GRADIENT">Gradient</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
