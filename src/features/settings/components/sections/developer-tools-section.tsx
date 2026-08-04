"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { updateDemoMode } from "@/features/settings/services/actions";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";

export function DeveloperToolsSection({ demoModeEnabled }: { demoModeEnabled: boolean }) {
  const [enabled, setEnabled] = useState(demoModeEnabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const result = await updateDemoMode(next);
      if (!result.success) {
        setEnabled(!next);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Demo/test data enabled" : "Demo/test data disabled");
    });
  }

  return (
    <SettingsSectionCard id="developer-tools" title="Developer Tools" description="Super Admin only.">
      <div className="flex flex-row items-start justify-between gap-4 rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FlaskConical className="size-4.5" />
          </div>
          <div>
            <p className="text-sm font-medium">🧪 Enable Demo/Test Data</p>
            <p className="text-xs text-muted-foreground">
              When off, you see only real production data. When on, Members, Community, Messages, Analytics, Projects,
              Spaces, Events, and Notifications all display realistic sample data instead — nothing in production is
              ever modified, deleted, or overwritten. This stays on until you turn it off again.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isPending} />
      </div>
    </SettingsSectionCard>
  );
}
