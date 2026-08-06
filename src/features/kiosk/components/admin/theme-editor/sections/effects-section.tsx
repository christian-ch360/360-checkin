import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { KioskAnimationStyle, KioskDecorativeElement } from "@prisma/client";
import { KIOSK_DECORATIVE_ELEMENT_VALUES, KIOSK_DECORATIVE_ELEMENTS } from "@/features/kiosk/config/kiosk-decorative-elements.config";
import type { FormState, UpdateFormField } from "../types";

export function EffectsSection({
  form,
  update,
  onToggleDecorativeElement,
}: {
  form: FormState;
  update: UpdateFormField;
  onToggleDecorativeElement: (key: KioskDecorativeElement) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="theme-animation">Entrance Animation</Label>
        <Select value={form.animationStyle} onValueChange={(v) => update("animationStyle", v as KioskAnimationStyle)}>
          <SelectTrigger id="theme-animation" className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FADE">Fade</SelectItem>
            <SelectItem value="SLIDE">Slide</SelectItem>
            <SelectItem value="ZOOM">Zoom</SelectItem>
            <SelectItem value="NONE">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Decorative Elements</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {KIOSK_DECORATIVE_ELEMENT_VALUES.map((key) => {
            const def = KIOSK_DECORATIVE_ELEMENTS[key];
            const active = form.decorativeElements.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggleDecorativeElement(key)}
                className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors ${active ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                <span className="text-sm font-medium">{def.label}</span>
                <span className="text-xs text-muted-foreground">{def.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
