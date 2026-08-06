import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState, UpdateFormField } from "../types";

export function PromotionSection({ form, update }: { form: FormState; update: UpdateFormField }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="theme-promo-text">Banner Text</Label>
        <Input id="theme-promo-text" value={form.promoBannerText} onChange={(e) => update("promoBannerText", e.target.value)} placeholder="Free gift with your first visit this week!" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="theme-promo-link">Banner Link (optional)</Label>
        <Input id="theme-promo-link" value={form.promoBannerLink} onChange={(e) => update("promoBannerLink", e.target.value)} />
      </div>
    </div>
  );
}
