import { Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export function LaunchPromoBanner({
  planName = "CreatorHub360 Membership",
  priceCents = 9900,
  trialMonths = 3,
  className,
}: {
  planName?: string;
  priceCents?: number;
  trialMonths?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-community/20 bg-community/5 p-4 sm:items-center sm:p-5 ${className ?? ""}`}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-community/10 text-community">
        <Sparkles className="size-4.5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-community">{planName} launch offer</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          🎉 {formatCurrency(priceCents / 100)}/mo — your first {trialMonths} months are free.
        </p>
      </div>
    </div>
  );
}
