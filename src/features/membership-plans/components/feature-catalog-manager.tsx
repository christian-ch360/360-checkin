"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Pencil, ListChecks } from "lucide-react";
import type { MembershipFeatureResetPeriod, MembershipFeatureValueType } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { FeatureFormDialog } from "@/features/membership-plans/components/feature-form-dialog";
import { toggleFeatureActive, reorderFeature } from "@/features/membership-plans/services/membership-features-actions";

type Feature = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  valueType: MembershipFeatureValueType;
  resetPeriod: MembershipFeatureResetPeriod;
  isActive: boolean;
};

const VALUE_TYPE_LABEL: Record<MembershipFeatureValueType, string> = {
  BOOLEAN: "Yes/No",
  NUMBER: "Number",
  TEXT: "Text",
};

const RESET_PERIOD_LABEL: Record<MembershipFeatureResetPeriod, string> = {
  NONE: "Never resets",
  DAILY: "Resets daily",
  MONTHLY: "Resets monthly",
};

export function FeatureCatalogManager({ features }: { features: Feature[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(featureId: string, isActive: boolean) {
    startTransition(async () => {
      const result = await toggleFeatureActive(featureId, isActive);
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  }

  function move(featureId: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderFeature(featureId, direction);
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  }

  if (features.length === 0) {
    return <EmptyState icon={ListChecks} title="No features yet" description="Create your first configurable benefit type." />;
  }

  return (
    <div className="space-y-3">
      {features.map((feature, index) => (
        <Card key={feature.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{feature.label}</p>
                <Badge variant="outline">{feature.key}</Badge>
                <Badge variant="secondary">{VALUE_TYPE_LABEL[feature.valueType]}</Badge>
                {feature.resetPeriod !== "NONE" && <Badge variant="secondary">{RESET_PERIOD_LABEL[feature.resetPeriod]}</Badge>}
                {!feature.isActive && <Badge variant="outline">Inactive</Badge>}
              </div>
              {feature.description && <p className="mt-1 text-xs text-muted-foreground">{feature.description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="icon-sm" variant="outline" disabled={isPending || index === 0} onClick={() => move(feature.id, "up")}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={isPending || index === features.length - 1}
                onClick={() => move(feature.id, "down")}
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <div className="flex items-center gap-2">
                <Switch checked={feature.isActive} disabled={isPending} onCheckedChange={(v) => toggle(feature.id, v)} />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
              <FeatureFormDialog
                feature={feature}
                trigger={
                  <Button size="icon-sm" variant="outline">
                    <Pencil className="size-3.5" />
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
