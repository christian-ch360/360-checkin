"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveAndActOnKioskScan } from "@/features/kiosk/services/kiosk-scan-dispatcher";
import type { KioskCheckInResult } from "@/features/kiosk/services/kiosk-checkin.service";
import type { KioskLocationRef } from "@/features/kiosk/services/kiosk-location-checkin.service";
import { HomeScreen } from "@/features/kiosk/components/home-screen";
import { KioskThemeBackground } from "@/features/kiosk/components/kiosk-theme-background";
import { ScanScreen } from "@/features/kiosk/components/scan-screen";
import { SuccessScreen } from "@/features/kiosk/components/success-screen";
import { ErrorScreen } from "@/features/kiosk/components/error-screen";
import { ApplyFormScreen } from "@/features/kiosk/components/apply-form-screen";
import { ApplySuccessScreen } from "@/features/kiosk/components/apply-success-screen";
import { OfflineBanner } from "@/features/kiosk/components/offline-banner";
import { useOfflineQueue } from "@/features/kiosk/hooks/use-offline-queue";
import type { ResolvedKioskTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";
import type { KioskAnnouncementCard } from "@/features/kiosk/components/kiosk-rotating-announcements";
import type { KioskFeaturedEvent } from "@/features/kiosk/services/kiosk-featured-event.service";
import { recordKioskInteractionAction } from "@/features/kiosk/services/kiosk-analytics-actions";
import { useKioskPreview } from "@/features/kiosk/context/kiosk-preview-context";

// "Automatically activate and deactivate. No manual switching required." — a kiosk left open
// for hours needs to pick up a newly-scheduled theme without anyone touching it; router.refresh()
// re-runs the server component (re-resolving the active theme) without resetting client state.
const THEME_REFRESH_MS = 5 * 60 * 1000;

type SuccessData = Extract<KioskCheckInResult, { outcome: "checked_in" | "checked_out" }>;
type ErrorOutcome = Exclude<KioskCheckInResult["outcome"], "checked_in" | "checked_out">;

type Screen =
  | { name: "home" }
  | { name: "scanning" }
  | { name: "success"; data: SuccessData }
  | { name: "error"; outcome: ErrorOutcome }
  | { name: "apply-form" }
  | { name: "apply-success" };

const SUCCESS_RESET_MS = 3000;
const ERROR_RESET_MS = 2800;
const APPLY_SUCCESS_RESET_MS = 12000;

export function KioskApp({
  kioskName,
  kioskLocation,
  location,
  theme,
  announcements,
  enabledSectionKeys,
  featuredEvent,
}: {
  kioskName: string;
  kioskLocation: string | null;
  location: KioskLocationRef | null;
  theme?: ResolvedKioskTheme | null;
  announcements?: KioskAnnouncementCard[];
  enabledSectionKeys?: string[];
  featuredEvent?: KioskFeaturedEvent | null;
}) {
  const router = useRouter();
  const { isPreview } = useKioskPreview();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEntrance = !location || location.type === "ENTRANCE";
  const { isOnline, enqueue } = useOfflineQueue(async (rawScan) => {
    if (isPreview) return;
    await resolveAndActOnKioskScan(rawScan, location);
  });
  const enabledSections = enabledSectionKeys ? new Set(enabledSectionKeys) : undefined;

  const goHome = useCallback(() => setScreen({ name: "home" }), []);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isPreview) return;
    const interval = setInterval(() => router.refresh(), THEME_REFRESH_MS);
    return () => clearInterval(interval);
  }, [router, isPreview]);

  function scheduleReset(ms: number) {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(goHome, ms);
  }

  function requestFullscreenOnce() {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // Fullscreen requires a user gesture and isn't available in every
        // browser context — the kiosk still works fine without it.
      });
    }
  }

  async function handleScan(rawScan: string) {
    if (isPreview) return;
    if (!isOnline) {
      enqueue(rawScan);
      setScreen({ name: "error", outcome: "not_found" });
      scheduleReset(ERROR_RESET_MS);
      return;
    }

    const result = await resolveAndActOnKioskScan(rawScan, location);
    if (result.outcome === "checked_in" || result.outcome === "checked_out") {
      setScreen({ name: "success", data: result });
      scheduleReset(SUCCESS_RESET_MS);
    } else {
      setScreen({ name: "error", outcome: result.outcome });
      scheduleReset(ERROR_RESET_MS);
    }
  }

  function handleApplySubmitted() {
    if (isPreview) return;
    setScreen({ name: "apply-success" });
    scheduleReset(APPLY_SUCCESS_RESET_MS);
    recordKioskInteractionAction("REGISTRATION", { themeKey: theme?.themeKey ?? null });
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto px-6 py-12 sm:py-16">
      <KioskThemeBackground theme={theme} />
      <OfflineBanner isOnline={isOnline} />

      {/* `m-auto` (not `justify-center` on the parent) centers this column
          when it fits and falls back to top-aligned + scrollable when it's
          taller than the viewport -- `justify-center` on an overflowing
          flex parent pushes the top half above y:0 with no way to scroll
          back up to it, which is exactly what clipped the kiosk logo. */}
      <div className="m-auto flex w-full flex-col items-center">
        {screen.name === "home" && (
          <HomeScreen
            kioskName={kioskName}
            kioskLocation={kioskLocation}
            isEntrance={isEntrance}
            theme={theme}
            announcements={announcements}
            enabledSections={enabledSections}
            featuredEvent={featuredEvent}
            onCheckIn={() => {
              if (isPreview) return;
              requestFullscreenOnce();
              setScreen({ name: "scanning" });
            }}
            onRegisterNow={() => {
              if (isPreview) return;
              requestFullscreenOnce();
              setScreen({ name: "apply-form" });
            }}
          />
        )}

        {screen.name === "scanning" && <ScanScreen onScan={handleScan} onCancel={goHome} theme={theme} />}

        {screen.name === "success" && <SuccessScreen {...screen.data} theme={theme} />}

        {screen.name === "error" && (
          <ErrorScreen outcome={screen.outcome} onScanAgain={() => setScreen({ name: "scanning" })} theme={theme} />
        )}

        {screen.name === "apply-form" && <ApplyFormScreen onSubmitted={handleApplySubmitted} onCancel={goHome} />}

        {screen.name === "apply-success" && <ApplySuccessScreen onDone={goHome} />}
      </div>
    </div>
  );
}
