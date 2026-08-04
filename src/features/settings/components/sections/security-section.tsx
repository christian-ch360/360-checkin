"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { passwordChangeSchema, type PasswordChangeInput } from "@/features/settings/schemas/settings.schema";
import { changePassword } from "@/features/settings/services/actions";
import { useSettingsFormDirty } from "@/features/settings/hooks/use-settings-form-dirty";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";
import { SettingsPasswordField } from "@/features/settings/components/settings-password-field";
import { PasswordStrengthMeter } from "@/features/settings/components/password-strength-meter";

export function SecuritySection() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useSettingsFormDirty(form.formState.isDirty);

  const newPassword = form.watch("newPassword");

  function onSubmit(values: PasswordChangeInput) {
    startTransition(async () => {
      const result = await changePassword(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Password updated");
      form.reset();
    });
  }

  return (
    <SettingsSectionCard id="security" title="Security" description="Change your account password.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <SettingsPasswordField label="Current password" autoComplete="current-password" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <SettingsPasswordField label="New password" autoComplete="new-password" {...field} />
                <PasswordStrengthMeter password={newPassword} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <SettingsPasswordField label="Confirm new password" autoComplete="new-password" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </Form>
    </SettingsSectionCard>
  );
}
