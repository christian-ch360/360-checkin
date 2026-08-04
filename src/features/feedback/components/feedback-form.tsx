"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { feedbackSchema, feedbackCategoryValues, type FeedbackInput } from "@/features/feedback/schemas/feedback.schema";
import { submitFeedback } from "@/features/feedback/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_LABELS: Record<(typeof feedbackCategoryValues)[number], string> = {
  PLATFORM: "Platform",
  FACILITY: "Facility",
  OTHER: "Other",
};

export function FeedbackForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { category: "PLATFORM", subject: "", body: "" },
  });

  function onSubmit(values: FeedbackInput) {
    startTransition(async () => {
      const result = await submitFeedback(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Feedback submitted — thanks!");
      form.reset();
      router.refresh();
    });
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Share feedback</CardTitle>
        <CardDescription>Tell us what&apos;s working, what&apos;s not, or what you&apos;d like to see.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {feedbackCategoryValues.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Short summary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What happened, or what would you like to see?" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send />}
              Submit feedback
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
