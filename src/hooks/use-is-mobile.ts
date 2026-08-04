"use client";

import { useEffect, useState } from "react";

const QUERY = "(max-width: 767px)";

/**
 * Returns `undefined` until mounted (avoids a hydration mismatch), then a live boolean
 * tracking whether the viewport is below Tailwind's `md` breakpoint (768px).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
