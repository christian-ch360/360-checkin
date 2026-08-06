import type { ReactNode } from "react";
import type { Viewport } from "next";
import Link from "next/link";
import { LogoMark } from "@/features/auth/components/logo-mark";
import { SafeAreaView } from "@/components/layout/safe-area-view";

// Public, unauthenticated, chrome-less route tree (see middleware.ts
// PUBLIC_PATHS) — the same "top-level, outside (auth)/(dashboard)" pattern
// used by /login and /apply, since these documents must be readable by
// visitors who don't have an account yet.
export const metadata = { title: { template: "%s · Legal · CreatorHub360", default: "Legal · CreatorHub360" } };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-white">
      <SafeAreaView className="mx-auto flex min-h-svh max-w-5xl flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-black/10 py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark variant="light" />
            <span className="text-sm font-semibold tracking-tight text-black">CreatorHub360</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-black/60 underline underline-offset-4 hover:text-black"
          >
            Sign in
          </Link>
        </header>

        <main className="flex flex-1 justify-center py-10 sm:py-14">{children}</main>

        <footer className="border-t border-black/10 py-6 text-center text-xs text-black/40">
          © {new Date().getFullYear()} CreatorHub360. All rights reserved.
        </footer>
      </SafeAreaView>
    </div>
  );
}
