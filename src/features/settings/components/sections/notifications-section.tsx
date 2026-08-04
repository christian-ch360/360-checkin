"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  notificationPrefsSchema,
  type NotificationPrefsInput,
} from "@/features/settings/schemas/settings.schema";
import { updateNotificationPreferences } from "@/features/settings/services/actions";
import { useSettingsFormDirty } from "@/features/settings/hooks/use-settings-form-dirty";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";

const ACTIVE_TOGGLES: { key: keyof NotificationPrefsInput; label: string; description: string }[] = [
  { key: "notifyCollabRequests", label: "Collaboration requests", description: "Applications, accepted collabs, and new messages." },
  { key: "notifyProjectInvites", label: "Project invitations", description: "When you're assigned to a project." },
];

const RESERVED_TOGGLES: { key: keyof NotificationPrefsInput; label: string; description: string }[] = [
  { key: "notifyEmail", label: "Email notifications", description: "This app doesn't send its own emails yet — saved for when it does." },
  { key: "notifySpaceBookings", label: "Space booking notifications", description: "No booking notifications exist yet — reserved for a future release." },
  { key: "notifyVisitorArrivals", label: "Visitor arrival notifications", description: "Reserved — visitor check-in doesn't notify hosts yet." },
  { key: "notifyWeeklySummary", label: "Weekly summary", description: "No digest email exists yet — reserved for a future release." },
  { key: "notifyProductUpdates", label: "Product updates", description: "Reserved for future announcements." },
];

export function NotificationsSection(props: NotificationPrefsInput) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<NotificationPrefsInput>({
    resolver: zodResolver(notificationPrefsSchema),
    defaultValues: props,
  });

  useSettingsFormDirty(form.formState.isDirty);

  function onSubmit(values: NotificationPrefsInput) {
    startTransition(async () => {
      const result = await updateNotificationPreferences(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Notification preferences saved");
      form.reset(values);
    });
  }

  return (
    <SettingsSectionCard id="notifications" title="Notifications" description="Choose what CreatorHub360 notifies you about.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notifies you about real activity
            </p>
            <div className="space-y-2">
              {ACTIVE_TOGGLES.map((t) => (
                <ToggleRow key={t.key} name={t.key} label={t.label} description={t.description} control={form.control} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reserved for upcoming features
            </p>
            <div className="space-y-2">
              {RESERVED_TOGGLES.map((t) => (
                <ToggleRow key={t.key} name={t.key} label={t.label} description={t.description} control={form.control} />
              ))}
            </div>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save preferences
          </Button>
        </form>
      </Form>
    </SettingsSectionCard>
  );
}

function ToggleRow({
  name,
  label,
  description,
  control,
}: {
  name: keyof NotificationPrefsInput;
  label: string;
  description: string;
  control: ReturnType<typeof useForm<NotificationPrefsInput>>["control"];
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        </FormItem>
      )}
    />
  );
}
