"use client";

import { motion } from "framer-motion";
import { AlertCircle, ShieldAlert } from "lucide-react";
import type { KioskCheckInResult } from "@/features/kiosk/services/kiosk-checkin.service";
import type { ResolvedKioskTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";

type Outcome = Exclude<KioskCheckInResult["outcome"], "checked_in" | "checked_out">;

const CONTENT: Record<Outcome, { icon: typeof AlertCircle; title: string; body: string; tone: "warn" | "block" | "info" }> = {
  not_found: {
    icon: AlertCircle,
    title: "Member Not Found",
    body: "Please try again.",
    tone: "warn",
  },
  wrong_type: {
    icon: AlertCircle,
    title: "Member Not Found",
    body: "Please try again.",
    tone: "warn",
  },
  wrong_org: {
    icon: AlertCircle,
    title: "Member Not Found",
    body: "Please try again.",
    tone: "warn",
  },
  expired: {
    icon: ShieldAlert,
    title: "Membership Expired",
    body: "Please see the front desk.",
    tone: "block",
  },
  pending_approval: {
    icon: ShieldAlert,
    title: "Application Pending",
    body: "Your membership is currently under review.",
    tone: "block",
  },
  rejected: {
    icon: ShieldAlert,
    title: "Membership Inactive",
    body: "Please contact CreatorHub360 support.",
    tone: "block",
  },
};

const TONE_STYLES: Record<"warn" | "block" | "info", string> = {
  warn: "bg-amber-50 text-amber-600",
  block: "bg-red-50 text-red-600",
  info: "bg-emerald-50 text-emerald-600",
};

export function ErrorScreen({
  outcome,
  onScanAgain,
  theme,
}: {
  outcome: Outcome;
  onScanAgain: () => void;
  /** Same opt-in as HomeScreen's action cards — only recolors the Retry button when
   * theme.themedActionButtons is set; the outcome copy/logic below never changes. */
  theme?: ResolvedKioskTheme | null;
}) {
  const { icon: Icon, title, body, tone } = CONTENT[outcome];
  const showScanAgain = outcome === "not_found" || outcome === "wrong_type" || outcome === "wrong_org";
  const isThemed = Boolean(theme && !theme.isDefault);
  const useThemedButton = Boolean(isThemed && theme?.themedActionButtons && theme.buttonColor);

  return (
    <motion.div
      role="status"
      aria-live="assertive"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-md flex-col items-center gap-6 text-center"
    >
      <div className={`flex size-24 items-center justify-center rounded-full ${TONE_STYLES[tone]}`}>
        <Icon className="size-12" />
      </div>

      <div className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight text-balance text-black">{title}</p>
        <p className="text-lg text-black/50">{body}</p>
      </div>

      {showScanAgain && (
        <button
          type="button"
          onClick={onScanAgain}
          className={
            useThemedButton
              ? "min-h-14 w-full max-w-xs rounded-2xl bg-[var(--kiosk-btn-bg)] text-lg font-semibold text-[var(--kiosk-btn-text)] outline-none transition-transform active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-[var(--kiosk-btn-bg)]/30 focus-visible:ring-offset-4"
              : "min-h-14 w-full max-w-xs rounded-2xl bg-black text-lg font-semibold text-white outline-none transition-transform active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-black/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
          }
          style={
            useThemedButton
              ? ({
                  "--kiosk-btn-bg": theme!.buttonColor as string,
                  "--kiosk-btn-text": theme!.buttonTextColor || "#ffffff",
                } as React.CSSProperties)
              : undefined
          }
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}
