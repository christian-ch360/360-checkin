"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/features/members/components/tier-badge";
import { updateCommissionTierPercentage } from "@/features/commissions/services/actions";

type Tier = { id: string; code: string; name: string; percentage: string };

export function TierManager({ tiers, canManage }: { tiers: Tier[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(tiers.map((t) => [t.id, t.percentage]))
  );

  function save(tierId: string) {
    startTransition(async () => {
      const result = await updateCommissionTierPercentage({ tierId, percentage: values[tierId] });
      if (!result.success) toast.error(result.error);
      else toast.success("Tier updated");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission tiers</CardTitle>
        <CardDescription>Tier A pays the highest rate, Tier E the lowest.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiers.map((tier) => (
          <div key={tier.id} className="flex items-center gap-3">
            <TierBadge code={tier.code} />
            <span className="flex-1 text-sm text-muted-foreground">{tier.name}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                className="w-20"
                value={values[tier.id]}
                disabled={!canManage}
                onChange={(e) => setValues((v) => ({ ...v, [tier.id]: e.target.value }))}
              />
              <span className="text-sm text-muted-foreground">%</span>
              {canManage && (
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={isPending || values[tier.id] === tier.percentage}
                  onClick={() => save(tier.id)}
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
