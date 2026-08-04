"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatCurrency } from "@/lib/utils/format";
import { schedulePriceChange, cancelPricingSchedule } from "@/features/membership-plans/services/actions";

type PendingSchedule = { id: string; newPriceCents: number; effectiveAt: Date };

export function SchedulePriceDialog({
  planId,
  planName,
  pendingSchedules,
}: {
  planId: string;
  planName: string;
  pendingSchedules: PendingSchedule[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newPriceDollars, setNewPriceDollars] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");

  function onSubmit() {
    startTransition(async () => {
      const result = await schedulePriceChange(planId, { newPriceDollars, effectiveAt });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Price change scheduled");
      setNewPriceDollars("");
      setEffectiveAt("");
      router.refresh();
    });
  }

  function onCancel(scheduleId: string) {
    startTransition(async () => {
      const result = await cancelPricingSchedule(scheduleId);
      if (!result.success) toast.error(result.error);
      else toast.success("Scheduled price change canceled");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarClock /> Schedule price change
          {pendingSchedules.length > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs">{pendingSchedules.length}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a price change — {planName}</DialogTitle>
          <DialogDescription>Takes effect automatically on the date you pick, applied by the daily billing sweep.</DialogDescription>
        </DialogHeader>

        {pendingSchedules.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Pending</Label>
            {pendingSchedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm">
                <span>
                  {formatCurrency(s.newPriceCents / 100)}/mo starting {format(s.effectiveAt, "MMM d, yyyy")}
                </span>
                <Button size="icon-sm" variant="ghost" disabled={isPending} onClick={() => onCancel(s.id)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>New price / month ($)</Label>
            <Input type="number" step="0.01" placeholder="99" value={newPriceDollars} onChange={(e) => setNewPriceDollars(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Effective date</Label>
            <Input type="date" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={isPending || !newPriceDollars || !effectiveAt} className="w-full">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Schedule change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
