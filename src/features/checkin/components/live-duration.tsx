"use client";

import { useEffect, useState } from "react";
import { differenceInMinutes } from "date-fns";
import { formatDuration } from "@/lib/utils/format";

const TICK_MS = 30_000;

/** Ticks on its own so an open session's duration keeps advancing with no page refresh. */
export function LiveDuration({ since, className }: { since: Date; className?: string }) {
  const [minutes, setMinutes] = useState(() => differenceInMinutes(new Date(), since));

  useEffect(() => {
    const interval = setInterval(() => {
      setMinutes(differenceInMinutes(new Date(), since));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [since]);

  return <span className={className}>{formatDuration(minutes)}</span>;
}
