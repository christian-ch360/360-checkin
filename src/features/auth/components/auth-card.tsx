"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
  variant = "dark",
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "dark" | "light";
}) {
  const light = variant === "light";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={
        light
          ? "w-full max-w-[440px] rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.18)] sm:p-10"
          : "w-full max-w-[420px] rounded-[24px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_24px_70px_-24px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:p-10"
      }
    >
      <div className="space-y-2">
        <h1 className={light ? "text-3xl font-semibold tracking-tight text-black text-balance" : "text-2xl font-semibold tracking-tight text-white text-balance"}>
          {title}
        </h1>
        <p className={light ? "text-[15px] text-black/50" : "text-[15px] text-white/50"}>{description}</p>
      </div>

      <div className="mt-8">{children}</div>

      {footer && <div className={`mt-8 text-center text-sm ${light ? "text-black/50" : "text-white/50"}`}>{footer}</div>}
    </motion.div>
  );
}
