"use client";

import { motion } from "framer-motion";
import { LogoMark } from "@/features/auth/components/logo-mark";

export function LoginHero() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-[#fafafa] px-8 py-14 md:flex lg:px-12 xl:px-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <LogoMark size="lg" variant="light" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="max-w-md space-y-6"
      >
        <h1 className="text-4xl font-semibold tracking-tight text-balance text-black lg:text-5xl xl:text-6xl">
          The operating system for your creator campus.
        </h1>
        <p className="text-lg text-black/50 text-balance xl:text-xl">
          Members, projects, spaces, and GMV — one workspace, built for how CreatorHub360 actually runs.
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-xs text-black/30"
      >
        © {new Date().getFullYear()} CreatorHub360
      </motion.p>
    </div>
  );
}
