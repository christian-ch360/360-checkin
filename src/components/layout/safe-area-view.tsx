import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared safe-area-aware page column for chrome-less, full-bleed surfaces
 * (auth pages, kiosk) that render under `viewport-fit=cover` with no
 * browser UI of their own to naturally keep content clear of the notch,
 * Dynamic Island, Android status bar, or home indicator. Reserves those
 * insets via `env()` padding in addition to normal horizontal rhythm, and
 * optionally centers content under a max width. Decorative full-bleed
 * elements (backgrounds, gradients) should stay outside this wrapper so
 * only real content respects the safe area.
 */
export function SafeAreaView({
  as: Component = "div",
  children,
  className,
  maxWidth,
  edges = "all",
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Optional max-width applied to a centered inner wrapper, e.g. "28rem". */
  maxWidth?: string;
  /** Which safe-area edges to pad. Defaults to all four. */
  edges?: "all" | "top" | "bottom" | "top-bottom" | "x";
}) {
  const edgeClass = {
    all: "pt-safe pb-safe pl-safe pr-safe",
    top: "pt-safe",
    bottom: "pb-safe",
    "top-bottom": "pt-safe pb-safe",
    x: "pl-safe pr-safe",
  }[edges];

  const content = maxWidth ? (
    <div className="mx-auto w-full" style={{ maxWidth }}>
      {children}
    </div>
  ) : (
    children
  );

  return <Component className={cn("w-full", edgeClass, className)}>{content}</Component>;
}
