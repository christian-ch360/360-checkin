import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

/** A labeled px slider — shared by the Hero Logo Size control (Branding) and
 * the Hero Typography sliders (Typography) so both read from the same
 * min/max/value/onChange shape instead of duplicating the row markup. */
export function SizeSliderField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{value}px</span>
      </div>
      <Slider id={id} min={min} max={max} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
