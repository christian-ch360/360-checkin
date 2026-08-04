"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import type { SystemRole } from "@prisma/client";
import { User, Mail, Phone, Building2, Link2, Users2, ShieldCheck, Hash } from "lucide-react";
import { signupAction, type AuthActionState } from "@/features/auth/services/actions";
import { appliedRoleValues } from "@/features/auth/schemas/auth.schema";
import { agencyMemberRoleValues } from "@/features/applications/schemas/application.schema";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthSelect } from "@/features/auth/components/auth-select";
import { AuthTextarea } from "@/features/auth/components/auth-textarea";
import { AuthPasswordInput } from "@/features/auth/components/auth-password-input";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { AuthBanner } from "@/features/auth/components/auth-banner";
import { LegalConsentField } from "@/features/legal/components/legal-consent-field";
import { SYSTEM_ROLE_LABELS } from "@/lib/permissions/member-rules";

type Invitation = { token: string; email: string; role: SystemRole };

/** Only ever rendered with a valid invitation — /signup redirects to /apply otherwise. */
export function SignupForm({ invitation }: { invitation: Invitation }) {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    signupAction,
    null
  );
  const [appliedRole, setAppliedRole] = useState<(typeof appliedRoleValues)[number]>("STAFF");
  const [claimIntent, setClaimIntent] = useState(false);
  const [claimRole, setClaimRole] = useState<(typeof agencyMemberRoleValues)[number]>("STAFF");
  const [claimRequestNote, setClaimRequestNote] = useState("");

  return (
    <AuthCard
      title="Accept your invitation"
      description={`You've been invited to join CreatorHub360 as ${SYSTEM_ROLE_LABELS[invitation.role]}. Finish setting up your account below.`}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-white underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-5">
        {state?.error && (
          <AuthBanner tone="error">
            <div className="space-y-2">
              <p>{state.error}</p>
              {state.existingAgencyId && !claimIntent && (
                <button
                  type="button"
                  onClick={() => setClaimIntent(true)}
                  className="text-sm font-medium underline underline-offset-2"
                >
                  Request Access to Existing Agency
                </button>
              )}
              {state.existingAgencyId && claimIntent && (
                <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-white/50">
                    Select your role at {state.existingAgencyName}, then submit again — their admins will review
                    your request.
                  </p>
                  <AuthSelect
                    label="Your role at this agency"
                    id="claimAgencyRoleSelect"
                    icon={<Users2 className="size-[18px]" />}
                    value={claimRole}
                    onChange={(e) => setClaimRole(e.target.value as (typeof agencyMemberRoleValues)[number])}
                  >
                    {agencyMemberRoleValues.map((r) => (
                      <option key={r} value={r} className="text-black">
                        {r.charAt(0) + r.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </AuthSelect>
                  <AuthTextarea
                    label="Why are you requesting to join this agency? (optional)"
                    id="claimRequestNote"
                    placeholder="I've been represented by this agency for two years."
                    maxLength={1000}
                    value={claimRequestNote}
                    onChange={(e) => setClaimRequestNote(e.target.value)}
                  />
                </div>
              )}
            </div>
          </AuthBanner>
        )}
        <input type="hidden" name="claimAgencyId" value={claimIntent ? (state?.existingAgencyId ?? "") : ""} />
        <input type="hidden" name="claimAgencyRole" value={claimIntent ? claimRole : ""} />
        <input type="hidden" name="claimRequestNote" value={claimIntent ? claimRequestNote : ""} />
        <AuthBanner tone="info">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 shrink-0" />
            Invited as {SYSTEM_ROLE_LABELS[invitation.role]} — your application will be approved automatically.
          </span>
        </AuthBanner>

        <input type="hidden" name="inviteToken" value={invitation.token} />

        <AuthInput
          label="Full name"
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Jane Creator"
          icon={<User className="size-[18px]" />}
          required
        />

        <AuthInput
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@creatorhub360.com"
          icon={<Mail className="size-[18px]" />}
          defaultValue={invitation.email}
          readOnly
          required
        />

        <AuthPasswordInput
          label="Password"
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />

        <AuthPasswordInput
          label="Confirm password"
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />

        <div className="border-t border-white/10 pt-5">
          <p className="mb-4 text-xs font-medium tracking-wide text-white/40 uppercase">
            Application details
          </p>

          <div className="space-y-5">
            <AuthInput
              label="Phone (optional)"
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              icon={<Phone className="size-[18px]" />}
            />

            <AuthInput
              label="Company (optional)"
              id="companyName"
              name="companyName"
              autoComplete="organization"
              placeholder="Your company or brand"
              icon={<Building2 className="size-[18px]" />}
            />

            <AuthSelect
              label="Role"
              id="appliedRole"
              name="appliedRole"
              icon={<Users2 className="size-[18px]" />}
              value={appliedRole}
              onChange={(e) => setAppliedRole(e.target.value as (typeof appliedRoleValues)[number])}
              required
            >
              {appliedRoleValues.map((role) => (
                <option key={role} value={role} className="text-black">
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </AuthSelect>

            <AuthTextarea
              label="Bio (optional)"
              id="bio"
              name="bio"
              placeholder="Tell us a bit about yourself or your work."
            />

            {appliedRole === "AGENCY" && (
              <div className="space-y-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-medium tracking-wide text-white/40 uppercase">
                  Agency details — used to prevent duplicate agency records
                </p>
                <AuthInput
                  label="Website"
                  id="website"
                  name="website"
                  placeholder="https://youragency.com"
                  icon={<Link2 className="size-[18px]" />}
                />
                <AuthInput
                  label="Business registration number (optional)"
                  id="businessRegistrationNumber"
                  name="businessRegistrationNumber"
                  placeholder="EIN / registration ID"
                  icon={<ShieldCheck className="size-[18px]" />}
                />
              </div>
            )}

            {appliedRole === "CREATOR" && (
              <div className="space-y-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-medium tracking-wide text-white/40 uppercase">
                  Creator info
                </p>
                <AuthInput
                  label="Follower count (optional)"
                  id="followerCount"
                  name="followerCount"
                  type="number"
                  min="0"
                  placeholder="10000"
                  icon={<Users2 className="size-[18px]" />}
                />
                <AuthInput
                  label="Platforms (optional)"
                  id="platforms"
                  name="platforms"
                  placeholder="Instagram, TikTok, YouTube"
                  icon={<Link2 className="size-[18px]" />}
                />
                <div className="space-y-1.5">
                  <AuthInput
                    label="Agency ID (optional)"
                    id="agencyCode"
                    name="agencyCode"
                    placeholder="AGY-001284"
                    icon={<Hash className="size-[18px]" />}
                  />
                  <p className="text-xs text-white/40">
                    Referred by an agency? Enter their Agency ID and they&apos;ll be asked to approve the connection.
                  </p>
                </div>
              </div>
            )}

            <AuthInput
              label="Instagram (optional)"
              id="instagramUrl"
              name="instagramUrl"
              placeholder="https://instagram.com/..."
              icon={<Link2 className="size-[18px]" />}
            />
            <AuthInput
              label="TikTok (optional)"
              id="tiktokUrl"
              name="tiktokUrl"
              placeholder="https://tiktok.com/@..."
              icon={<Link2 className="size-[18px]" />}
            />
            <AuthInput
              label="YouTube (optional)"
              id="youtubeUrl"
              name="youtubeUrl"
              placeholder="https://youtube.com/@..."
              icon={<Link2 className="size-[18px]" />}
            />
            <AuthInput
              label="LinkedIn (optional)"
              id="linkedinUrl"
              name="linkedinUrl"
              placeholder="https://linkedin.com/in/..."
              icon={<Link2 className="size-[18px]" />}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <LegalConsentField
            id="termsAccepted"
            name="termsAccepted"
            text="I agree to CreatorHub360's"
            links={[{ href: "/legal/terms", label: "Terms & Conditions" }]}
            required
          />
          <LegalConsentField
            id="privacyAccepted"
            name="privacyAccepted"
            text="I have read and agree to the"
            links={[{ href: "/legal/privacy", label: "Privacy Policy" }]}
            required
          />
          <LegalConsentField
            id="dataProcessingAccepted"
            name="dataProcessingAccepted"
            text="I consent to the collection and processing of my personal data as described in the"
            links={[{ href: "/legal/privacy#data-processing", label: "Privacy Policy" }]}
            required
          />
          <LegalConsentField
            id="mediaReleaseAccepted"
            name="mediaReleaseAccepted"
            text="I agree to the"
            links={[
              { href: "/legal/media-release", label: "Media Release" },
              { href: "/legal/release-of-liability", label: "Release of Liability" },
            ]}
            required
          />
        </div>

        <AuthSubmitButton isPending={isPending}>Accept invitation</AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
