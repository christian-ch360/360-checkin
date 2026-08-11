"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle, Building2 } from "lucide-react";
import {
  acceptBrandInvitationAction,
  declineBrandInvitationAction,
} from "@/features/agencies/services/brand-invitation-actions";
import { AuthCard } from "@/features/auth/components/auth-card";
import type { ValidatedBrandInvitation } from "@/features/agencies/services/brand-invitations.service";

type Invitation = Pick<ValidatedBrandInvitation, "fullName" | "email" | "brandName">;

export function BrandInviteCard({
  token,
  invitation,
  isLoggedIn,
}: {
  token: string;
  invitation: Invitation | null;
  isLoggedIn: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ status: "accepted"; brandName: string } | { status: "declined" } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptBrandInvitationAction(token);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setResult({ status: "accepted", brandName: res.brandName });
    });
  }

  function handleDecline() {
    setError(null);
    startTransition(async () => {
      const res = await declineBrandInvitationAction(token);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setResult({ status: "declined" });
    });
  }

  if (!invitation) {
    return (
      <AuthCard variant="light" title="Invitation not found" description="This link is invalid or has expired.">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex size-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-500">
            <XCircle className="size-8" />
          </div>
          <p className="text-[15px] text-black/60">
            Ask whoever invited you to send a new invitation, or reach out to the agency directly.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 text-[15px] font-medium text-black/70 transition-colors hover:bg-black/[0.03] hover:text-black"
        >
          Return to login
        </Link>
      </AuthCard>
    );
  }

  if (result?.status === "accepted") {
    return (
      <AuthCard variant="light" title="You're in!" description={`Welcome to ${result.brandName}'s portal.`}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex size-16 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-8" />
          </div>
          <p className="text-[15px] text-black/60">You can now view campaigns, contracts, and invoices.</p>
        </div>
        <Link
          href="/agency"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-black text-[15px] font-medium text-white transition-colors hover:bg-black/85"
        >
          Go to Portal
        </Link>
      </AuthCard>
    );
  }

  if (result?.status === "declined") {
    return (
      <AuthCard variant="light" title="Invitation declined" description="You won't be added to this brand's portal.">
        <p className="text-[15px] text-black/60">
          If this was a mistake, ask whoever invited you to send a new invitation.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      variant="light"
      title={`Join ${invitation.brandName}`}
      description={`${invitation.fullName}, you've been invited to view ${invitation.brandName}'s campaigns, contracts, and invoices.`}
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            <XCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {isLoggedIn ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleAccept}
              disabled={isPending}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-[15px] font-semibold text-white outline-none transition-all duration-200 hover:bg-black/85 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Accept invitation
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={isPending}
              className="flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 text-[15px] font-medium text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black disabled:opacity-50"
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Decline
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-black/60">
              <Building2 className="size-4 shrink-0" />
              <p className="text-sm">Sign in if you already have a CreatorHub360 account, or apply to create one.</p>
            </div>
            <Link
              href={`/login?redirectTo=${encodeURIComponent(`/brand-invite/${token}`)}`}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-black text-[15px] font-medium text-white transition-colors hover:bg-black/85"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={handleDecline}
              disabled={isPending}
              className="flex h-10 w-full items-center justify-center text-sm font-medium text-black/40 transition-colors hover:text-black/60 disabled:opacity-50"
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Not interested
            </button>
          </div>
        )}
      </div>
    </AuthCard>
  );
}
