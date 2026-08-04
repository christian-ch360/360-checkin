"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import type { MembershipFeatureResetPeriod, MembershipFeatureValueType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { setPlanFeatureValue } from "@/features/membership-plans/services/actions";

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

type RowState = {
  included: boolean;
  numberValue: string;
  textValue: string;
  isUnlimited: boolean;
  displayOverride: string;
};

function buildInitialState(features: Feature[], existingValues: ExistingValue[]): Record<string, RowState> {
  const byFeature = new Map(existingValues.map((v) => [v.featureId, v]));
  const state: Record<string, RowState> = {};
  for (const feature of features) {
    const existing = byFeature.get(feature.id);
    state[feature.id] = {
      included: feature.valueType === "BOOLEAN" ? Boolean(existing?.boolValue) : Boolean(existing),
      numberValue: existing?.numberValue != null ? String(existing.numberValue) : "",
      textValue: existing?.textValue ?? "",
      isUnlimited: existing?.isUnlimited ?? false,
      displayOverride: existing?.displayOverride ?? "",
    };
  }
  return state;
}

export function PlanFeatureValuesDialog({
  planId,
  planName,
  features,
  existingValues,
}: {
  planId: string;
  planName: string;
  features: Feature[];
  existingValues: ExistingValue[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<Record<string, RowState>>(() => buildInitialState(features, existingValues));

  function updateRow(featureId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [featureId]: { ...prev[featureId], ...patch } }));
  }

  function onSave() {
    startTransition(async () => {
      const results = await Promise.all(
        features.map((feature) => {
          const row = rows[feature.id];
          if (feature.valueType === "BOOLEAN") {
            return setPlanFeatureValue(planId, feature.id, {
              boolValue: row.included || undefined,
              isUnlimited: row.isUnlimited || undefined,
              displayOverride: row.displayOverride || undefined,
            });
          }
          if (feature.valueType === "TEXT") {
            return setPlanFeatureValue(planId, feature.id, {
              textValue: row.textValue || undefined,
              displayOverride: row.displayOverride || undefined,
            });
          }
          return setPlanFeatureValue(planId, feature.id, {
            numberValue: !row.isUnlimited && row.numberValue !== "" ? Number(row.numberValue) : undefined,
            isUnlimited: row.isUnlimited || undefined,
            displayOverride: row.displayOverride || undefined,
          });
        })
      );

      const failed = results.find((r) => !r.success);
      if (failed && !failed.success) {
        toast.error(failed.error);
        return;
      }
      toast.success("Benefits updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Sparkles /> Edit benefits
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit benefits — {planName}</DialogTitle>
          <DialogDescription>
            Set this package&rsquo;s value for each configurable benefit. These values drive both the member-facing benefit
            list and access-control enforcement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {features.map((feature) => {
            const row = rows[feature.id];
            return (
              <div key={feature.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{feature.label}</p>
                  {feature.valueType === "BOOLEAN" && (
                    <Switch checked={row.included} onCheckedChange={(v) => updateRow(feature.id, { included: v })} />
                  )}
                </div>

                {feature.valueType === "TEXT" && (
                  <Input
                    placeholder="e.g. Co-Working Office Access"
                    value={row.textValue}
                    onChange={(e) => updateRow(feature.id, { textValue: e.target.value })}
                  />
                )}

                {feature.valueType === "NUMBER" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      className="w-32"
                      placeholder="0"
                      disabled={row.isUnlimited}
                      value={row.numberValue}
                      onChange={(e) => updateRow(feature.id, { numberValue: e.target.value })}
                    />
                    {feature.resetPeriod !== "NONE" && (
                      <span className="text-xs text-muted-foreground">
                        {feature.resetPeriod === "DAILY" ? "per day" : "per month"}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.isUnlimited}
                        onCheckedChange={(v) => updateRow(feature.id, { isUnlimited: v })}
                      />
                      <Label className="text-xs text-muted-foreground">Unlimited</Label>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Custom display text (optional)</Label>
                  <Input
                    placeholder="Overrides the auto-generated benefit line"
                    value={row.displayOverride}
                    onChange={(e) => updateRow(feature.id, { displayOverride: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:rounded-none max-sm:bg-card/95 max-sm:backdrop-blur">
          <Button onClick={onSave} disabled={isPending} className="w-full max-sm:h-12 max-sm:text-base">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save benefits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
