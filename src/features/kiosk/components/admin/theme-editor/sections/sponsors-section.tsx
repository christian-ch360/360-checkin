import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState, Sponsor } from "../types";

export function SponsorsSection({
  form,
  onAdd,
  onUpdate,
  onRemove,
}: {
  form: FormState;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<Sponsor>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="size-3.5" /> Add Sponsor
        </Button>
      </div>
      {form.sponsors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sponsor logos yet.</p>
      ) : (
        form.sponsors.map((sponsor, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2">
            <Input placeholder="Sponsor name" value={sponsor.name} onChange={(e) => onUpdate(i, { name: e.target.value })} />
            <Input placeholder="Logo URL" value={sponsor.logoUrl} onChange={(e) => onUpdate(i, { logoUrl: e.target.value })} />
            <Input
              placeholder="Short message (optional)"
              value={sponsor.message ?? ""}
              onChange={(e) => onUpdate(i, { message: e.target.value })}
              className="sm:col-span-2"
            />
            <Input placeholder="CTA label (optional)" value={sponsor.ctaLabel ?? ""} onChange={(e) => onUpdate(i, { ctaLabel: e.target.value })} />
            <div className="flex gap-2">
              <Input placeholder="CTA link (optional)" value={sponsor.ctaLink ?? ""} onChange={(e) => onUpdate(i, { ctaLink: e.target.value })} />
              <Button size="icon" variant="ghost" className="shrink-0 text-destructive" onClick={() => onRemove(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
