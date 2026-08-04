"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Laptop, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";

function parseUserAgent(ua: string): { browser: string; os: string } {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua) && !/Chromium/.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua) && !/Chrome/.test(ua)
          ? "Safari"
          : "Unknown browser";

  const os = /Mac OS X/.test(ua)
    ? "macOS"
    : /Windows/.test(ua)
      ? "Windows"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";

  return { browser, os };
}

export function ActiveSessionsSection() {
  const [device, setDevice] = useState<{ browser: string; os: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDevice(parseUserAgent(navigator.userAgent));
  }, []);

  function handleSignOutOthers() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Signed out of all other sessions");
    });
  }

  return (
    <SettingsSectionCard
      id="active-sessions"
      title="Active Sessions"
      description="Devices signed in to your CreatorHub360 account."
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Laptop className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {device ? `${device.browser} on ${device.os}` : "This device"}
            </p>
            <p className="text-xs text-muted-foreground">Last active just now</p>
          </div>
          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            Current session
          </Badge>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Listing your other signed-in devices individually needs Supabase&apos;s Admin API, which isn&apos;t
            configured for this project — so they can&apos;t be shown here. You can still sign out of all of
            them at once below.
          </p>
        </div>

        <Button variant="outline" onClick={handleSignOutOthers} disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Sign Out Other Devices
        </Button>
      </div>
    </SettingsSectionCard>
  );
}
