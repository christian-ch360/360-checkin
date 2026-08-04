"use client";

import { motion } from "framer-motion";
import { LogoMark } from "@/features/auth/components/logo-mark";

/**
 * Centered logo + headline + subheadline block — the light-theme page
 * header shared by /apply and the kiosk home screen (see kiosk redesign),
 * so both surfaces open with the exact same visual rhythm instead of each
 * hand-rolling their own hero.
 */
export function AuthPageHeader({
  headline,
  subheadline,
  eyebrow,
  logoSize = "xl",
}: {
  headline: string;
  subheadline: string;
  eyebrow?: string;
  logoSize?: "lg" | "xl";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <LogoMark size={logoSize} variant="light" />
      <div className="max-w-lg space-y-3">
        {eyebrow && (
          <p className="text-sm font-medium tracking-[0.2em] text-black/40 uppercase">{eyebrow}</p>
        )}
        <h1 className="text-4xl font-semibold tracking-tight text-balance text-black sm:text-5xl">{headline}</h1>
        <p className="text-lg text-black/50 text-balance">{subheadline}</p>
      </div>
    </motion.div>
  );
}
