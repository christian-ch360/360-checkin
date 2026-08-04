"use client";

import { useEffect } from "react";
import { MaintenancePage } from "@/components/shared/maintenance-page";

/**
 * Catches any unhandled rendering/runtime error thrown while the root
 * layout itself is healthy (the overwhelmingly common case) — replaces
 * Next's default error screen with the branded maintenance page. The error
 * is logged here, server- or client-side depending on where it was thrown,
 * and never rendered to the user.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return <MaintenancePage onRefresh={reset} />;
}
