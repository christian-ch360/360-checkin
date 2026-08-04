"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, CreditCard, ArrowUp, ArrowDown } from "lucide-react";
import type { MembershipFeatureResetPeriod, MembershipFeatureValueType } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PlanFormDialog } from "@/features/membership-plans/components/plan-form-dialog";
import { PlanFeatureValuesDialog } from "@/features/membership-plans/components/plan-feature-values-dialog";
import { SchedulePriceDialog } from "@/features/membership-plans/components/schedule-price-dialog";
import { togglePlanActive, reorderPlan } from "@/features/membership-plans/services/actions";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

type Feature = {
  id: string;
  key: string;
  label: string;
  valueType: MembershipFeatureValueType;
  resetPeriod: MembershipFeatureResetPeriod;
};

type ExistingValue = {
  featureId: string;
  boolValue: boolean | null;
  numberValue: number | null;
  textValue: string | null;
  isUnlimited: boolean;
  displayOverride: string | null;
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  trialMonths: number;
  benefits: string[];
  isActive: boolean;
  _count: { subscriptions: number };
  featureValues: ExistingValue[];
  pendingSchedules: { id: string; newPriceCents: number; effectiveAt: Date }[];
  analytics: { subscriberCount: number; mrrContributionCents: number; upgradesInto: number; downgradesInto: number } | null;
};

export function PlansTable({ plans, features }: { plans: Plan[]; features: Feature[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(planId: string, isActive: boolean) {
    startTransition(async () => {
      const result = await togglePlanActive(planId, isActive);
      if (!result.success) toast.error(result.error);
      else toast.success(isActive ? "Plan activated" : "Plan deactivated");
      router.refresh();
    });
  }

  function move(planId: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderPlan(planId, direction);
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  }

  if (plans.length === 0) {
    return <EmptyState icon={CreditCard} title="No plans yet" description="Create your first membership plan." />;
  }

  return (
    <div className="space-y-3">
      {plans.map((plan, index) => (
        <Card key={plan.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <Badge variant="outline">{formatCurrency(plan.priceCents / 100)}/mo</Badge>
                  {plan.trialMonths > 0 && <Badge variant="secondary">{plan.trialMonths}mo free trial</Badge>}
                  {!plan.isActive && <Badge variant="outline">Inactive</Badge>}
                  {plan.pendingSchedules.length > 0 && <Badge variant="secondary">Price change scheduled</Badge>}
                </div>
                {plan.description && <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan._count.subscriptions} subscribers
                  {plan.analytics && ` · ${formatCompactCurrency(plan.analytics.mrrContributionCents / 100)} MRR contribution`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button size="icon-sm" variant="outline" disabled={isPending || index === 0} onClick={() => move(plan.id, "up")}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={isPending || index === plans.length - 1}
                  onClick={() => move(plan.id, "down")}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Switch checked={plan.isActive} disabled={isPending} onCheckedChange={(v) => toggle(plan.id, v)} />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
                <PlanFormDialog
                  plan={plan}
                  trigger={
                    <Button size="icon-sm" variant="outline">
                      <Pencil className="size-3.5" />
                    </Button>
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <PlanFeatureValuesDialog planId={plan.id} planName={plan.name} features={features} existingValues={plan.featureValues} />
              <SchedulePriceDialog planId={plan.id} planName={plan.name} pendingSchedules={plan.pendingSchedules} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
