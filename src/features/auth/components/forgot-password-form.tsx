"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import { forgotPasswordAction, type AuthActionState } from "@/features/auth/services/actions";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { AuthBanner } from "@/features/auth/components/auth-banner";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    forgotPasswordAction,
    null
  );

  return (
    <AuthCard
      title="Reset your password"
      description="We'll email you a link to set a new one."
      footer={
        <Link href="/login" className="font-medium text-white underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <form action={formAction} className="space-y-5">
        {state?.error && <AuthBanner tone="error">{state.error}</AuthBanner>}

        <AuthInput
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@creatorhub360.com"
          icon={<Mail className="size-[18px]" />}
          required
        />

        <AuthSubmitButton isPending={isPending}>Send reset link</AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
