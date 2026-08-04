"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { membershipPlanSchema, type MembershipPlanInput } from "@/features/membership-plans/schemas/membership-plan.schema";
import { createPlan, updatePlan } from "@/features/membership-plans/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

type PlanFormProps = {
  plan?: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    trialMonths: number;
    benefits: string[];
    isActive: boolean;
  };
  trigger?: React.ReactNode;
};

export function PlanFormDialog({ plan, trigger }: PlanFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(plan);

  const form = useForm<MembershipPlanInput>({
    resolver: zodResolver(membershipPlanSchema),
    defaultValues: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      priceDollars: plan ? (plan.priceCents / 100).toString() : "",
      trialMonths: plan ? String(plan.trialMonths) : "0",
      benefits: plan?.benefits.join("\n") ?? "",
      isActive: plan?.isActive ?? true,
    },
  });

  function onSubmit(values: MembershipPlanInput) {
    startTransition(async () => {
      const result = isEdit ? await updatePlan(plan!.id, values) : await createPlan(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Plan updated" : "Plan created");
      form.reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus /> New plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent mobileFullscreen className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update pricing and benefits." : "Add a new membership plan."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan name</FormLabel>
                  <FormControl>
                    <Input placeholder="CreatorHub360 Membership" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What makes this plan worth it?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priceDollars"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price / month ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="99" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trialMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free trial (months)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefits (one per line)</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder={"Full facility access\nCollab Hub access"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border p-3">
                  <FormLabel className="mb-0">Active</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:rounded-none max-sm:bg-card/95 max-sm:backdrop-blur">
              <Button type="submit" disabled={isPending} className="w-full max-sm:h-12 max-sm:text-base">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save changes" : "Create plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
