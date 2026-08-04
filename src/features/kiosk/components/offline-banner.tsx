"use client";

import { WifiOff } from "lucide-react";

export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute top-0 inset-x-0 flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 py-3 text-sm font-medium text-amber-700"
    >
      <WifiOff className="size-4" />
      Offline — Retrying… Scans are being saved and will sync once you&apos;re back online.
    </div>
  );
}
