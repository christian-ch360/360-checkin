"use client";

import { useActionState, type CSSProperties } from "react";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { enterLibraryAction, type LibraryAccessState } from "@/features/creator-library/auth/actions";
import { LibraryWordmark } from "@/features/creator-library/components/library-wordmark";

/**
 * Spec §2 — the password screen. Fixed warm-cream + gold surface,
 * independent of the app's light/dark theme (same rationale as the /login
 * and /kiosk surfaces) — a graph-paper grid with a soft gold glow tucked in
 * the corner, editorial rather than app-chrome. The password is submitted to
 * a Server Action and never touches client JS beyond the input value.
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
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#FAF9F6] px-5 py-16 text-[#161616]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(23,23,23,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,23,23,0.07) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-1/3 -right-1/4 size-[46rem] rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.35),transparent_65%)] blur-2xl"
        aria-hidden
      />
      <p
        className="pointer-events-none absolute bottom-6 right-8 text-lg italic text-neutral-900/15 select-none"
        aria-hidden
      >
        creatorhub360
      </p>

      <div
        className="relative w-full max-w-sm"
        style={{ "--foreground": "#171717", "--muted-foreground": "#6b6b6b" } as CSSProperties}
      >
        <div className="flex flex-col items-center gap-8 text-center">
          <LibraryWordmark size="lg" />

          <div className="space-y-3">
            <p className="text-[0.7rem] font-medium tracking-[0.28em] text-neutral-500 uppercase">
              Private Access
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Discover the creators behind the network.
            </h1>
            <p className="text-sm text-neutral-600 text-balance">
              The CreatorHub360 Creator Network is a private directory for CreatorHub360 partners and
              collaborators. Enter the shared access password to continue.
            </p>
          </div>
        </div>

        <form action={formAction} className="mt-10 space-y-4">
          {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

          <div className="group relative flex h-14 items-center rounded-xl border border-neutral-900/10 bg-white/70 shadow-sm transition-colors focus-within:border-neutral-900/25 focus-within:bg-white">
            <span className="pointer-events-none flex w-12 shrink-0 items-center justify-center text-neutral-400 group-focus-within:text-neutral-700">
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
              className="h-full w-full min-w-0 flex-1 bg-transparent pr-4 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400"
            />
          </div>

          {state?.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          {!configured ? (
            <p className="text-sm text-amber-700" role="status">
              Access isn&apos;t configured yet. An administrator needs to set{" "}
              <code className="rounded bg-neutral-900/5 px-1 py-0.5 text-xs">CREATOR_LIBRARY_PASSWORD</code>.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!configured || isPending}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-[15px] font-semibold text-white outline-none transition-all duration-200 hover:bg-neutral-800 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-neutral-900/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF7E9]"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enter Library
            {!isPending && <ArrowRight className="size-4" />}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-neutral-400">
          Powered by CreatorHub360 · CreatorHub360 Operations
        </p>
      </div>
    </div>
  );
}
