"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { createFeature, updateFeature } from "@/features/membership-plans/services/membership-features-actions";
import { membershipFeatureSchema, type MembershipFeatureInput } from "@/features/membership-plans/schemas/membership-feature.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type FeatureFormProps = {
  feature?: { id: string; key: string; label: string; description: string | null; valueType: MembershipFeatureInput["valueType"]; resetPeriod: MembershipFeatureInput["resetPeriod"] };
  trigger?: React.ReactNode;
};

export function FeatureFormDialog({ feature, trigger }: FeatureFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(feature);

  const form = useForm<MembershipFeatureInput>({
    resolver: zodResolver(membershipFeatureSchema),
    defaultValues: {
      key: feature?.key ?? "",
      label: feature?.label ?? "",
      description: feature?.description ?? "",
      valueType: feature?.valueType ?? "BOOLEAN",
      resetPeriod: feature?.resetPeriod ?? "NONE",
    },
  });

  function onSubmit(values: MembershipFeatureInput) {
    startTransition(async () => {
      const result = isEdit ? await updateFeature(feature!.id, values) : await createFeature(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Feature updated" : "Feature created");
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
            <Plus /> New feature
          </Button>
        )}
      </DialogTrigger>
      <DialogContent mobileFullscreen className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit feature" : "New feature"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Structural changes affect every package using this feature."
              : "Add a new configurable membership benefit type."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="Board Room Access" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input placeholder="board_room_access" {...field} />
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
                    <Textarea placeholder="What this benefit unlocks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="valueType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BOOLEAN">Yes/No</SelectItem>
                        <SelectItem value="NUMBER">Number</SelectItem>
                        <SelectItem value="TEXT">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="resetPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resets</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Never</SelectItem>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:rounded-none max-sm:bg-card/95 max-sm:backdrop-blur">
              <Button type="submit" disabled={isPending} className="w-full max-sm:h-12 max-sm:text-base">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save changes" : "Create feature"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
