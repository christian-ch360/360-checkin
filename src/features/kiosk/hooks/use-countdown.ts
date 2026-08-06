"use client";

import { useEffect, useState } from "react";
import { useKioskPreview } from "@/features/kiosk/context/kiosk-preview-context";

export function useCountdown(target: Date | null) {
  const { simulatedOffsetMs } = useKioskPreview();
  const [remaining, setRemaining] = useState<number | null>(target ? target.getTime() - (Date.now() + simulatedOffsetMs) : null);
  useEffect(() => {
    if (!target) return;
    const interval = setInterval(() => setRemaining(target.getTime() - (Date.now() + simulatedOffsetMs)), 1000);
    return () => clearInterval(interval);
  }, [target, simulatedOffsetMs]);
  if (!target || remaining === null || remaining <= 0) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}
