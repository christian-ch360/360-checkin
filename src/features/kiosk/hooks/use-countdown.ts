"use client";

import { useEffect, useState } from "react";

export function useCountdown(target: Date | null) {
  const [remaining, setRemaining] = useState<number | null>(target ? target.getTime() - Date.now() : null);
  useEffect(() => {
    if (!target) return;
    const interval = setInterval(() => setRemaining(target.getTime() - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);
  if (!target || remaining === null || remaining <= 0) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}
