"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Mail } from "lucide-react";
import { ConfettiBurst } from "@/features/kiosk/components/confetti-burst";

export function ApplySuccessScreen({ onDone }: { onDone: () => void }) {
  return (
    <div role="status" aria-live="polite" className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
      <ConfettiBurst />

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative"
      >
        <div className="absolute inset-0 -z-10 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="flex size-28 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-400 shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset]">
          <CheckCircle2 className="size-14" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="space-y-3"
      >
        <p className="text-4xl font-semibold tracking-tight text-balance text-black">Application Submitted</p>
        <p className="text-lg text-black/50 text-balance">
          Thank you for applying to CreatorHub360. Your application is under review — we&apos;ll notify you as soon
          as your membership is approved.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="flex items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.02] px-5 py-3 text-black/50"
      >
        <Mail className="size-5 shrink-0" />
        <p className="text-sm">Look out for an email confirming what happens next.</p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        type="button"
        onClick={onDone}
        className="min-h-16 w-full max-w-xs rounded-2xl bg-black text-lg font-semibold text-white outline-none transition-transform active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-black/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
      >
        Return to Welcome
      </motion.button>
    </div>
  );
}
