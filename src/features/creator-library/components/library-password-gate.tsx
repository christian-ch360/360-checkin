"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { enterLibraryAction, type LibraryAccessState } from "@/features/creator-library/auth/actions";
import { LibraryWordmark } from "@/features/creator-library/components/library-wordmark";

/**
 * Spec §2 — the password screen. Fixed-dark premium surface, independent of
 * the app's light/dark theme (same rationale as the /login and /kiosk
 * surfaces). The password is submitted to a Server Action and never touches
 * client JS beyond the input value.
 */
export function LibraryPasswordGate({
  redirectTo,
  configured,
}: {
  redirectTo?: string;
  configured: boolean;
}) {
  const [state, formAction, isPending] = useActionState<LibraryAccessState, FormData>(
    enterLibraryAction,
    null,
  );

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#08090b] px-5 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 auth-grid-bg" aria-hidden />
      <div className="pointer-events-none absolute inset-0 auth-noise-bg" aria-hidden />
      <div
        className="animate-aurora-a pointer-events-none absolute -top-1/3 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.22),transparent_60%)] blur-2xl"
        aria-hidden
      />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-8 text-center">
          <LibraryWordmark tone="invert" size="lg" />

          <div className="space-y-3">
            <p className="text-[0.7rem] font-medium tracking-[0.28em] text-white/40 uppercase">
              Private Access
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Discover the creators behind the network.
            </h1>
            <p className="text-sm text-white/50 text-balance">
              The CH360 Creator Network is a private directory for CreatorHub360 partners and
              collaborators. Enter the shared access password to continue.
            </p>
          </div>
        </div>

        <form action={formAction} className="mt-10 space-y-4">
          {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

          <div className="group relative flex h-14 items-center rounded-xl border border-white/10 bg-white/[0.03] transition-colors focus-within:border-white/25 focus-within:bg-white/[0.06]">
            <span className="pointer-events-none flex w-12 shrink-0 items-center justify-center text-white/40 group-focus-within:text-white/70">
              <LockKeyhole className="size-5" />
            </span>
            <input
              type="password"
              name="password"
              autoFocus
              autoComplete="off"
              required
              disabled={!configured || isPending}
              placeholder="Enter access password"
              aria-label="Access password"
              aria-invalid={state?.error ? true : undefined}
              className="h-full w-full min-w-0 flex-1 bg-transparent pr-4 text-[15px] text-white outline-none placeholder:text-white/30"
            />
          </div>

          {state?.error ? (
            <p className="text-sm text-red-400" role="alert">
              {state.error}
            </p>
          ) : null}

          {!configured ? (
            <p className="text-sm text-amber-300/90" role="status">
              Access isn&apos;t configured yet. An administrator needs to set{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">CREATOR_LIBRARY_PASSWORD</code>.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!configured || isPending}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-black outline-none transition-all duration-200 hover:bg-white/90 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b]"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enter Library
            {!isPending && <ArrowRight className="size-4" />}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-white/30">
          Powered by CreatorHub360 · CH360 Operations
        </p>
      </div>
    </div>
  );
}
