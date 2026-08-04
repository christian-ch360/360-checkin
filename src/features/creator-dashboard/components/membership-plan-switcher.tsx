"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowUpCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { changeMembershipPlan } from "@/features/members/services/membership-actions";
import type { PlanBenefitLine } from "@/features/membership-plans/services/membership-features.service";

type SwitchablePlan = { id: string; name: string; priceCents: number; entitlements: PlanBenefitLine[] };

/** Entitlements the target plan has that the current plan doesn't (new benefits, or the same benefit at a different level) — the checklist an upgrade/downgrade card highlights. */
function diffEntitlements(current: PlanBenefitLine[], target: PlanBenefitLine[]): PlanBenefitLine[] {
  const currentByKey = new Map(current.map((b) => [b.key, b.statusLabel]));
  return target.filter((b) => currentByKey.get(b.key) !== b.statusLabel);
}

export function MembershipPlanSwitcher({
  currentPlanId,
  currentPlanName,
  currentPriceCents,
  currentEntitlements,
  plans,
  disabled,
}: {
  currentPlanId: string;
  currentPlanName: string;
  currentPriceCents: number;
  currentEntitlements: PlanBenefitLine[];
  plans: SwitchablePlan[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const otherPlans = plans.filter((p) => p.id !== currentPlanId);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const isUpgrade = selectedPlan ? selectedPlan.priceCents >= currentPriceCents : true;
  const priceDeltaCents = selectedPlan ? selectedPlan.priceCents - currentPriceCents : 0;
  const changedEntitlements = selectedPlan ? diffEntitlements(currentEntitlements, selectedPlan.entitlements) : [];

  function onConfirm() {
    if (!selectedPlanId) return;
    startTransition(async () => {
      const result = await changeMembershipPlan(selectedPlanId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Package switched to ${selectedPlan?.name ?? "your new package"}.`);
      setConfirmOpen(false);
      setSelectedPlanId("");
      router.refresh();
    });
  }

  if (otherPlans.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={disabled}>
          <SelectTrigger className="w-56" size="sm">
            <SelectValue placeholder="Choose a package..." />
          </SelectTrigger>
          <SelectContent>
            {otherPlans.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} · {formatCurrency(p.priceCents / 100)}/mo
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={disabled || !selectedPlanId} onClick={() => setConfirmOpen(true)}>
          <ArrowUpCircle /> Switch package
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isUpgrade ? "Upgrade" : "Downgrade"} your package</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-2xl border bg-muted/30 p-4 text-center">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="mt-1 text-sm font-semibold">{currentPlanName}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(currentPriceCents / 100)}/mo</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex-1 rounded-2xl border-2 border-primary bg-primary/5 p-4 text-center">
              <p className="text-xs text-primary">{isUpgrade ? "Upgrade to" : "Downgrade to"}</p>
              <p className="mt-1 text-sm font-semibold">{selectedPlan?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedPlan ? formatCurrency(selectedPlan.priceCents / 100) : ""}/mo
              </p>
            </div>
          </div>

          {changedEntitlements.length > 0 && (
            <div className="space-y-2 rounded-xl border p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {isUpgrade ? "What you'll gain" : "What changes"}
              </p>
              {changedEntitlements.map((line) => (
                <div key={line.key} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  <span>{line.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{line.statusLabel}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center rounded-xl bg-muted/30 p-3">
            <span
              className={cn(
                "text-lg font-semibold tabular-nums",
                priceDeltaCents > 0 && "text-primary",
                priceDeltaCents < 0 && "text-muted-foreground"
              )}
            >
              {priceDeltaCents === 0
                ? "No price change"
                : `${priceDeltaCents > 0 ? "+" : "-"}${formatCurrency(Math.abs(priceDeltaCents) / 100)}/month`}
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm {isUpgrade ? "upgrade" : "downgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
