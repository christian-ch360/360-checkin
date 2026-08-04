"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import { loginAction, type AuthActionState } from "@/features/auth/services/actions";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthPasswordInput } from "@/features/auth/components/auth-password-input";
import { AuthCheckbox } from "@/features/auth/components/auth-checkbox";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { AuthBanner } from "@/features/auth/components/auth-banner";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";

export function LoginForm({ message, redirectTo }: { message?: string; redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    loginAction,
    null
  );

  return (
    <AuthCard
      variant="light"
      title="Sign in to CreatorHub360"
      description="Access your creator workspace."
      footer={
        <>
          First time here?{" "}
          <Link href="/kiosk" className="font-medium text-black underline underline-offset-4">
            Request access
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-5">
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
        {message && <AuthBanner variant="light" tone="info">{message}</AuthBanner>}
        {state?.error && <AuthBanner variant="light" tone="error">{state.error}</AuthBanner>}

        <AuthInput
          variant="light"
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@creatorhub360.com"
          icon={<Mail className="size-[18px]" />}
          required
        />

        <div className="space-y-2">
          <AuthPasswordInput
            variant="light"
            label="Password"
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <AuthCheckbox variant="light" id="rememberMe" name="rememberMe" label="Remember me" defaultChecked />
          <Link href="/forgot-password" className="text-sm font-medium text-black/60 underline underline-offset-4 hover:text-black/80">
            Forgot password?
          </Link>
        </div>

        <AuthSubmitButton variant="light" isPending={isPending}>Continue</AuthSubmitButton>
      </form>

      <div className="mt-5">
        <OAuthButtons variant="light" redirectTo={redirectTo} />
      </div>
    </AuthCard>
  );
}
