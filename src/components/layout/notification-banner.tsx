"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared global-banner shell — sits inside the sticky header group in
 * (dashboard)/layout.tsx, directly below Topbar. Deliberately uses a SOLID
 * warning background (not bg-warning/NN opacity) — the previous low-opacity
 * wash, composited over the near-black dark-mode page background, produced a
 * barely-tinted dark surface that then got dark warning-foreground text
 * painted on top of it, making the banner nearly invisible in dark mode.
 * --warning-foreground is a fixed near-black in both themes, so a solid
 * --warning background always has guaranteed AA contrast in both modes.
 *
 * `icon` takes an already-rendered element (`<FileText />`), not a component
 * type — this is a Client Component (needs useState for dismiss), and its
 * callers are plain Server Components. A raw component reference can't cross
 * that server/client boundary as a prop (React can't serialize a function),
 * but an already-rendered element can.
 */
export function NotificationBanner({
  icon,
  message,
  ctaLabel,
  ctaHref,
  dismissible = false,
  className,
}: {
  icon: ReactNode;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  dismissible?: boolean;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className={cn(
        "relative z-10 flex min-h-12 items-center gap-3 border-b border-black/10 bg-warning px-4 py-2 text-warning-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] sm:px-6",
        className
      )}
    >
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
      <p className="min-w-0 flex-1 text-sm leading-snug font-medium text-balance">{message}</p>
      {ctaLabel && ctaHref && (
        <Button asChild size="sm" className="shrink-0">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
      {dismissible && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss"
          className="shrink-0 text-warning-foreground hover:bg-black/10 hover:text-warning-foreground dark:hover:bg-black/20"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
