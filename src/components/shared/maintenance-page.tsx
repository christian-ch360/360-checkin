"use client";

import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";
import { AuthBackground } from "@/features/auth/components/auth-background";
import { LogoMark } from "@/features/auth/components/logo-mark";

/**
 * Branded fallback shown in place of the default Next.js error screen for
 * any unexpected render/runtime error under the root layout (see
 * src/app/error.tsx). Never receives the actual error object — callers log
 * it separately — so there's no way for a stack trace or technical message
 * to leak into this UI.
 */
export function MaintenancePage({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center p-6">
      <AuthBackground />
      <div className="w-full max-w-[420px] rounded-[24px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_24px_70px_-24px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:p-10">
        <div className="flex justify-center">
          <LogoMark size="lg" />
        </div>

        <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
          <span className="size-2 animate-bounce rounded-full bg-white/50 [animation-delay:-0.3s]" />
          <span className="size-2 animate-bounce rounded-full bg-white/50 [animation-delay:-0.15s]" />
          <span className="size-2 animate-bounce rounded-full bg-white/50" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-balance text-white">We&apos;ll Be Back Shortly</h1>
        <p className="mt-3 text-[15px] text-white/50">
          CreatorHub360 is currently undergoing maintenance or experiencing a temporary issue. Please check back in a
          few minutes.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRefresh}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-black outline-none transition-transform active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#08090b]"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
          <Link
            href="/"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 text-[15px] font-medium text-white/70 outline-none transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#08090b]"
          >
            <Home className="size-4" /> Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
