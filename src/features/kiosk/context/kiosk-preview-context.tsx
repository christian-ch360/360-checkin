"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type KioskPreviewContextValue = {
  /** True only inside the admin Theme Editor's live preview panel. Everywhere
   * else (the real /kiosk route) this is false via the default context value
   * below, so gated behavior is unchanged in production without a provider. */
  isPreview: boolean;
  /** Added to Date.now() everywhere the kiosk tree needs "now" (countdown,
   * date-label formatting) — 0 outside preview or when no simulated time is
   * set, so real kiosk behavior is untouched. */
  simulatedOffsetMs: number;
};

const defaultValue: KioskPreviewContextValue = { isPreview: false, simulatedOffsetMs: 0 };

const KioskPreviewContext = createContext<KioskPreviewContextValue>(defaultValue);

/**
 * Wraps the *exact* production kiosk component tree (KioskLayout + KioskApp)
 * when it's mounted inside the admin Theme Editor's preview panel, so that
 * tree — and only that tree — knows to disable navigation/mutations and
 * optionally simulate a different "now". Everything under a route that never
 * renders this provider behaves exactly as it always has.
 */
export function KioskPreviewProvider({ simulatedNow, children }: { simulatedNow: Date | null; children: ReactNode }) {
  // Recomputed only when the admin actually changes the simulated-time input
  // (not on every unrelated re-render) so the offset stays anchored to the
  // instant it was set, letting real elapsed time continue to tick the
  // countdown forward from there instead of freezing it.
  const simulatedTime = simulatedNow ? simulatedNow.getTime() : null;
  const value = useMemo<KioskPreviewContextValue>(
    () => ({ isPreview: true, simulatedOffsetMs: simulatedTime !== null ? simulatedTime - Date.now() : 0 }),
    [simulatedTime]
  );
  return <KioskPreviewContext.Provider value={value}>{children}</KioskPreviewContext.Provider>;
}

export function useKioskPreview(): KioskPreviewContextValue {
  return useContext(KioskPreviewContext);
}

/** Current instant for kiosk rendering purposes — real wall-clock time outside preview, or the simulated instant (still advancing in real time) inside it. */
export function useKioskNow(): Date {
  const { simulatedOffsetMs } = useKioskPreview();
  return new Date(Date.now() + simulatedOffsetMs);
}
