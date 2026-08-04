"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";

const OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid a hydration mismatch: the resolved theme isn't known until the
  // client reads localStorage/matchMedia, same reasoning next-themes' own
  // docs give for gating theme-dependent UI behind a mount check.
  useEffect(() => setMounted(true), []);

  return (
    <SettingsSectionCard id="appearance" title="Appearance" description="Choose how CreatorHub360 looks on this device.">
      <div className="inline-flex rounded-xl border p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-pressed={mounted && theme === opt.value}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              mounted && theme === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <opt.icon className="size-4" />
            {opt.label}
          </button>
        ))}
      </div>
    </SettingsSectionCard>
  );
}
