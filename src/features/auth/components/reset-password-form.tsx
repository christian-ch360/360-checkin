"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { resetPasswordAction, type AuthActionState } from "@/features/auth/services/actions";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthPasswordInput } from "@/features/auth/components/auth-password-input";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { AuthBanner } from "@/features/auth/components/auth-banner";

type VerifyStatus = "checking" | "ready" | "invalid";

function scorePassword(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["bg-red-400", "bg-red-400", "bg-amber-400", "bg-lime-400", "bg-emerald-400"];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? STRENGTH_COLORS[score] : "bg-white/10"}`}
          />
        ))}
      </div>
      <p className="text-xs text-white/40">{STRENGTH_LABELS[score]}</p>
    </div>
  );
}

// Handles all three shapes Supabase might use to deliver a recovery session:
//   - #access_token=...&type=recovery (default hosted-verify email link) —
//     the browser client auto-parses this from the URL on init.
//   - ?code=... (PKCE) — also auto-detected on init.
//   - ?token_hash=...&type=recovery (customized email template) — needs an
//     explicit verifyOtp call, so it's handled here manually.
// All three are handled client-side because a server Route Handler can never
// see the hash-fragment case at all (fragments aren't sent in HTTP requests).
function useRecoverySession() {
  const [status, setStatus] = useState<VerifyStatus>("checking");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function verify() {
      const url = new URL(window.location.href);
      if (url.searchParams.get("error")) {
        if (!cancelled) setStatus("invalid");
        return;
      }

      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ type: type as "recovery", token_hash: tokenHash });
        if (cancelled) return;
        if (error) {
          setStatus("invalid");
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session) {
        window.history.replaceState(null, "", "/reset-password");
        setStatus("ready");
      } else {
        setStatus("invalid");
      }
    }

    verify();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        window.history.replaceState(null, "", "/reset-password");
        setStatus("ready");
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return status;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const verifyStatus = useRecoverySession();
  const [password, setPassword] = useState("");
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    resetPasswordAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      const timeout = setTimeout(() => router.push("/login"), 1600);
      return () => clearTimeout(timeout);
    }
  }, [state?.success, router]);

  if (state?.success) {
    return (
      <AuthCard title="Password updated" description="Redirecting you to sign in.">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="size-5 shrink-0" />
          Password updated successfully
        </div>
      </AuthCard>
    );
  }

  if (verifyStatus === "checking") {
    return (
      <AuthCard title="Verifying your link" description="Hold on while we confirm your reset link.">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
          <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          Checking your reset link…
        </div>
      </AuthCard>
    );
  }

  if (verifyStatus === "invalid") {
    return (
      <AuthCard title="Link expired" description="This password reset link is invalid or has expired.">
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-red-300">
            <XCircle className="size-5 shrink-0" />
            Reset links only work once and expire after a while — request a new one to continue.
          </div>
          <Link
            href="/forgot-password"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-white text-[15px] font-semibold text-black transition-all duration-200 hover:bg-white/90 active:scale-[0.985]"
          >
            Request another reset link
          </Link>
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-white/10 text-[15px] font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            Return to login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set your password" description="Choose a password for your CreatorHub360 account.">
      <form action={formAction} className="space-y-5">
        {state?.error && <AuthBanner tone="error">{state.error}</AuthBanner>}

        <div>
          <AuthPasswordInput
            label="New password"
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PasswordStrength password={password} />
        </div>

        <AuthPasswordInput
          label="Confirm password"
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />

        <AuthSubmitButton isPending={isPending}>Update password</AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
