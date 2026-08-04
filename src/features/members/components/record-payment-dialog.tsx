"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  recordMembershipPaymentSchema,
  type RecordMembershipPaymentInput,
} from "@/features/members/schemas/membership.schema";
import { recordMembershipPayment } from "@/features/members/services/membership-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type RecordPaymentDialogProps = {
  subscriptionId: string;
  planName: string;
  trigger?: React.ReactNode;
};

export function RecordPaymentDialog({ subscriptionId, planName, trigger }: RecordPaymentDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<RecordMembershipPaymentInput>({
    resolver: zodResolver(recordMembershipPaymentSchema),
    defaultValues: { subscriptionId, amountDollars: "", note: "" },
  });

  function onSubmit(values: RecordMembershipPaymentInput) {
    startTransition(async () => {
      const result = await recordMembershipPayment(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment recorded");
      form.reset({ subscriptionId, amountDollars: "", note: "" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm">Record payment</Button>}</DialogTrigger>
      <DialogContent mobileFullscreen className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>Logs a payment for the {planName} membership and renews the billing period.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amountDollars"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="49.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Paid via bank transfer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
