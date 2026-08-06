import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState, ThemeColor } from "../types";

export function ThemePaletteSection({
  form,
  onAdd,
  onUpdate,
  onRemove,
}: {
  form: FormState;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<ThemeColor>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          A named palette (e.g. &ldquo;Forest Green&rdquo;) used to tint the decorative elements below — separate from the functional colors in Colors.
        </p>
        <Button size="sm" variant="outline" onClick={onAdd} className="shrink-0">
          <Plus className="size-3.5" /> Add Color
        </Button>
      </div>
      {form.themeColors.map((color, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input placeholder="Snow White" value={color.name} onChange={(e) => onUpdate(i, { name: e.target.value })} />
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : "#000000"}
            onChange={(e) => onUpdate(i, { hex: e.target.value })}
            className="h-9 w-12 shrink-0 cursor-pointer rounded-md border"
          />
          <Input className="w-28 shrink-0" value={color.hex} onChange={(e) => onUpdate(i, { hex: e.target.value })} />
          <Button size="icon" variant="ghost" className="shrink-0 text-destructive" onClick={() => onRemove(i)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
