"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { emailChangeSchema, type EmailChangeInput } from "@/features/settings/schemas/settings.schema";
import { changeEmail } from "@/features/settings/services/actions";
import { useSettingsFormDirty } from "@/features/settings/hooks/use-settings-form-dirty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";
import { SettingsPasswordField } from "@/features/settings/components/settings-password-field";

export function ChangeEmailSection({ currentEmail }: { currentEmail: string }) {
  const [isPending, startTransition] = useTransition();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const form = useForm<EmailChangeInput>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: "", confirmPassword: "" },
  });

  useSettingsFormDirty(form.formState.isDirty);

  function onSubmit(values: EmailChangeInput) {
    startTransition(async () => {
      const result = await changeEmail(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Verification email sent");
      setPendingEmail(values.newEmail);
      form.reset();
    });
  }

  return (
    <SettingsSectionCard id="change-email" title="Change Email" description="Update the email you sign in with.">
      <div className="max-w-md space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Current email</p>
          <p className="font-medium">{currentEmail}</p>
        </div>

        {pendingEmail && (
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
            <MailCheck className="mt-0.5 size-4 shrink-0" />
            <p>
              Check <strong>{pendingEmail}</strong> for a confirmation link. Your sign-in email won&apos;t change
              until you confirm it.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@creatorhub360.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <SettingsPasswordField label="Confirm password" autoComplete="current-password" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Update email
            </Button>
          </form>
        </Form>
      </div>
    </SettingsSectionCard>
  );
}
