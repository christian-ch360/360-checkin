"use client";

import { motion } from "framer-motion";
import { QrCode, TrendingUp, DoorOpen } from "lucide-react";
import { LogoMark } from "@/features/auth/components/logo-mark";

const FEATURES = [
  {
    icon: QrCode,
    title: "Check in, in seconds",
    description: "One QR scan clocks members into the building — kiosk, badge, or dashboard.",
  },
  {
    icon: TrendingUp,
    title: "GMV and commission, live",
    description: "Every sale attributed to the right creator, brand, and tier automatically.",
  },
  {
    icon: DoorOpen,
    title: "Spaces that book themselves",
    description: "Studios and rooms stay booked, occupied, or free — no spreadsheet required.",
  },
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden px-8 py-14 md:flex lg:px-12 xl:px-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <LogoMark size="lg" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="max-w-md space-y-6"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-balance text-white lg:text-4xl xl:text-5xl">
          The operating system for your creator campus.
        </h2>
        <p className="text-lg text-white/50 text-balance">
          Members, projects, spaces, and GMV — one workspace, built for how CreatorHub360 actually runs.
        </p>

        <div className="space-y-5 pt-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.08, ease: "easeOut" }}
              className="flex items-start gap-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70">
                <f.icon className="size-[18px]" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-white">{f.title}</p>
                <p className="text-sm text-white/45">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-xs text-white/30"
      >
        © {new Date().getFullYear()} CreatorHub360
      </motion.p>
    </div>
  );
}
