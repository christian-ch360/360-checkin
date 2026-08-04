"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Target } from "lucide-react";
import { revenueGoalSchema, type RevenueGoalInput } from "@/features/revenue/schemas/revenue.schema";
import { updateRevenueGoal } from "@/features/revenue/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { RevenueGoalSummary } from "@/features/revenue/services/revenue.service";

function GoalFormDialog({ defaultValue, trigger }: { defaultValue?: number; trigger: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<RevenueGoalInput>({
    resolver: zodResolver(revenueGoalSchema),
    defaultValues: { annualGoal: defaultValue ? String(defaultValue) : "" },
  });

  function onSubmit(values: RevenueGoalInput) {
    startTransition(async () => {
      const result = await updateRevenueGoal(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Revenue goal updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent mobileFullscreen>
        <DialogHeader>
          <DialogTitle>Set your annual revenue goal</DialogTitle>
          <DialogDescription>Track your progress toward this goal throughout the year.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="annualGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual goal ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="100000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Save goal
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function RevenueGoalCard({ goal }: { goal: RevenueGoalSummary | null }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Annual Revenue Goal</CardTitle>
        <CardDescription>{new Date().getFullYear()} progress</CardDescription>
      </CardHeader>
      <CardContent>
        {!goal ? (
          <EmptyState
            icon={Target}
            title="Set your first revenue goal"
            description="Give yourself a target to track your earnings against this year."
            action={
              <GoalFormDialog
                trigger={
                  <Button size="sm">
                    <Target /> Set your goal
                  </Button>
                }
              />
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-semibold tracking-tight">{formatCurrency(goal.annualGoalCents / 100)}</p>
              <GoalFormDialog
                defaultValue={goal.annualGoalCents / 100}
                trigger={
                  <Button size="sm" variant="outline">
                    Edit goal
                  </Button>
                }
              />
            </div>
            <Progress value={goal.progressPct} />
            <p className="text-sm text-muted-foreground">
              {formatCurrency(goal.yearTotal)} / {formatCurrency(goal.annualGoalCents / 100)} ·{" "}
              <span className="font-medium text-foreground">{formatPercent(goal.progressPct, 0)}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
