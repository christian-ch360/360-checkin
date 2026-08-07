"use client";

import { useState, useEffect, useActionState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Mail,
  User,
  Phone,
  Building2,
  Link2,
  AtSign,
  Users2,
  MapPin,
  Globe,
  QrCode,
  TrendingUp,
  DoorOpen,
  Loader2,
  XCircle,
  Hash,
} from "lucide-react";
import { submitApplicationAction, type SubmitApplicationState } from "@/features/applications/services/actions";
import { agencyMemberRoleValues } from "@/features/applications/schemas/application.schema";
import { validateReferralCodeAction } from "@/features/referrals/services/referral-actions";
import { APPLICANT_ROLE_VALUES, ROLE_LABELS } from "@/features/members/role-labels";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthSelect } from "@/features/auth/components/auth-select";
import { AuthTextarea } from "@/features/auth/components/auth-textarea";
import { AuthCheckbox } from "@/features/auth/components/auth-checkbox";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { AuthBanner } from "@/features/auth/components/auth-banner";
import { LegalConsentField } from "@/features/legal/components/legal-consent-field";
import { formatCurrency } from "@/lib/utils/format";

const NO_REFERRAL = "No Referral";

const BENEFIT_CHIPS = [
  { icon: QrCode, label: "Seconds to check in" },
  { icon: TrendingUp, label: "Live GMV & commission" },
  { icon: DoorOpen, label: "Bookable studios & spaces" },
];

/**
 * Fields the shortened form (below) no longer shows the applicant, but that
 * `applicationSchema` still requires or that downstream services still read.
 * Populated with sensible, honest defaults purely at the UI layer — no
 * schema, validation, or service change. See applicationSchema in
 * schemas/application.schema.ts for which of these are actually required.
 */
const UNCOLLECTED_LOCATION_PLACEHOLDER = "Not provided";

type ApplyFormProps = {
  plan?: { name: string; priceCents: number; trialMonths: number } | null;
  message?: string;
  defaultFullName?: string;
  defaultEmail?: string;
  /** Pre-validated server-side from the ?agency= query param — the creator
   * arrived via a QR code or shared referral link and never has to type
   * this in themselves. */
  referral?: { code: string; agencyName: string } | null;
  /** Pre-validated server-side from the ?agencyInviteToken= query param — the
   * applicant arrived via an Owner/Manager's team invitation link. Locks the
   * Role select to Agency and skips agency-duplicate concerns entirely since
   * the target agency is already known. */
  agencyInvite?: { token: string; agencyName: string; role: string } | null;
};

/**
 * ACTIVE — short-form public sign-up.
 *
 * Deliberately shows only Full Name, Social Handle, Email, and Phone plus
 * the required legal consent checkboxes, to reduce sign-up friction. Every
 * other field `applicationSchema`/`submitApplication` still expect is sent
 * as a hidden input with a sensible default so the exact same server
 * action, validation, database writes, notifications, and approval
 * workflow run unchanged:
 *
 * - `role` — "AGENCY" if the applicant arrived via a validated agency
 *   invite link, else "CREATOR" (the audience this short form targets;
 *   Brand/Agency/Broker applicants can still be onboarded via the full
 *   form, preserved below as `ApplyFormLegacy`).
 * - `instagram` / `tiktok` — both required by the schema; the single
 *   visible "Social handle" field is submitted as both, since most
 *   creators use the same handle everywhere.
 * - `city` / `state` / `country` — required by the schema but not
 *   collected here; sent as "Not provided" rather than a fabricated real
 *   place, so admin review is honest about what wasn't captured.
 * - `referredBy` — defaults to the app's existing "No Referral" sentinel.
 * - `referralCode` / `referralSource` — still populated from the
 *   server-validated `referral` deep-link prop, so QR/link-based agency
 *   attribution keeps working invisibly.
 * - `company`, `website`, `businessRegistrationNumber`, `claimAgencyId`,
 *   `claimAgencyRole`, `claimRequestNote`, `youtube` — all optional in the
 *   schema already; sent empty.
 */
export function ApplyForm({ plan, message, defaultFullName, defaultEmail, referral, agencyInvite }: ApplyFormProps) {
  const [state, formAction, isPending] = useActionState<SubmitApplicationState, FormData>(
    submitApplicationAction,
    null
  );
  const [socialHandle, setSocialHandle] = useState("");
  const role: (typeof APPLICANT_ROLE_VALUES)[number] = agencyInvite ? "AGENCY" : "CREATOR";

  if (state?.success) {
    return (
      <AuthCard variant="light" title="Application submitted" description="Your CreatorHub360 membership is under review.">
        <div className="flex flex-col items-center gap-6 py-2 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative"
          >
            <div className="absolute inset-0 -z-10 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="flex size-16 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-8" />
            </div>
          </motion.div>
          <p className="text-[15px] text-black/60">
            Thank you for applying. Our team reviews every application personally — we&apos;ll email you as soon as
            a decision is made.
          </p>
          <div className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-black/50">
            <Mail className="size-4 shrink-0" />
            <p className="text-sm">Keep an eye on your inbox for next steps.</p>
          </div>
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

  return (
    <AuthCard
      variant="light"
      title="Apply to join CreatorHub360"
      description="Every application is reviewed by our team before access is granted."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-black underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-6 space-y-4">
        <p className="text-[15px] text-black/50">
          Membership gives you a home base to work, collaborate, and grow alongside the CreatorHub360 community.
        </p>
        <div className="flex flex-wrap gap-2">
          {BENEFIT_CHIPS.map((b) => (
            <span
              key={b.label}
              className="flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.02] py-1.5 pr-3 pl-2 text-xs font-medium text-black/60"
            >
              <b.icon className="size-3.5 text-black/40" />
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        {plan && plan.trialMonths > 0 && (
          <AuthBanner variant="light" tone="info">
            🎉 {plan.name} launch offer — {formatCurrency(plan.priceCents / 100)}/mo, first {plan.trialMonths} months
            free for every approved member.
          </AuthBanner>
        )}
        {agencyInvite && (
          <AuthBanner variant="light" tone="info">
            You&apos;ve been invited to join <strong>{agencyInvite.agencyName}</strong> as{" "}
            {agencyInvite.role.charAt(0) + agencyInvite.role.slice(1).toLowerCase()}. Submit this application to
            join automatically once approved.
          </AuthBanner>
        )}
        {message && <AuthBanner variant="light" tone="info">{message}</AuthBanner>}
        {state?.error && (
          <AuthBanner variant="light" tone="error">
            <p>{state.error}</p>
          </AuthBanner>
        )}

        {/* Hidden fields — keep the exact same server action, validation, and
            approval workflow working for everything this shortened form no
            longer shows the applicant. See the doc comment above. */}
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="company" value="" />
        <input type="hidden" name="website" value="" />
        <input type="hidden" name="businessRegistrationNumber" value="" />
        <input type="hidden" name="claimAgencyId" value="" />
        <input type="hidden" name="claimAgencyRole" value="" />
        <input type="hidden" name="claimRequestNote" value="" />
        <input type="hidden" name="agencyInviteToken" value={agencyInvite?.token ?? ""} />
        <input type="hidden" name="tiktok" value={socialHandle} />
        <input type="hidden" name="youtube" value="" />
        <input type="hidden" name="city" value={UNCOLLECTED_LOCATION_PLACEHOLDER} />
        <input type="hidden" name="state" value={UNCOLLECTED_LOCATION_PLACEHOLDER} />
        <input type="hidden" name="country" value={UNCOLLECTED_LOCATION_PLACEHOLDER} />
        <input type="hidden" name="referredBy" value={NO_REFERRAL} />
        <input type="hidden" name="referralCode" value={referral?.code ?? ""} />
        <input type="hidden" name="referralSource" value={referral ? "QR_CODE" : ""} />

        <AuthInput
          variant="light"
          label="Full name"
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Jane Creator"
          icon={<User className="size-[18px]" />}
          defaultValue={defaultFullName}
          required
        />

        <AuthInput
          variant="light"
          label="Social handle"
          id="socialHandle"
          name="instagram"
          placeholder="@yourhandle"
          icon={<AtSign className="size-[18px]" />}
          value={socialHandle}
          onChange={(e) => setSocialHandle(e.target.value)}
          required
        />

        <AuthInput
          variant="light"
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@creatorhub360.com"
          icon={<Mail className="size-[18px]" />}
          defaultValue={defaultEmail}
          required
        />

        <AuthInput
          variant="light"
          label="Phone number"
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="(555) 123-4567"
          icon={<Phone className="size-[18px]" />}
          required
        />

        <div className="space-y-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
          <LegalConsentField
            variant="light"
            id="termsAccepted"
            name="termsAccepted"
            text="I agree to CreatorHub360's"
            links={[{ href: "/legal/terms", label: "Terms & Conditions" }]}
            required
          />
          <LegalConsentField
            variant="light"
            id="privacyAccepted"
            name="privacyAccepted"
            text="I have read and agree to the"
            links={[{ href: "/legal/privacy", label: "Privacy Policy" }]}
            required
          />
          <LegalConsentField
            variant="light"
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

        <AuthSubmitButton variant="light" isPending={isPending}>Submit application</AuthSubmitButton>
      </form>
    </AuthCard>
  );
}

/**
 * PRESERVED — NOT currently rendered anywhere.
 *
 * This is the original, full-detail public apply form (Role select,
 * Agency-specific fields, separate Instagram/TikTok/YouTube, City/State/
 * Country, "Who referred you"/Agency ID with live validation, and the
 * interactive "Request Access to Existing Agency" duplicate-claim flow).
 * Kept fully intact and type-checked — not commented out — so it keeps
 * compiling and can be restored at any time by having src/app/apply/page.tsx
 * render `ApplyFormLegacy` instead of `ApplyForm`. Do not delete.
 */
export function ApplyFormLegacy({ plan, message, defaultFullName, defaultEmail, referral, agencyInvite }: ApplyFormProps) {
  const [state, formAction, isPending] = useActionState<SubmitApplicationState, FormData>(
    submitApplicationAction,
    null
  );
  const [role, setRole] = useState<(typeof APPLICANT_ROLE_VALUES)[number]>(agencyInvite ? "AGENCY" : "CREATOR");
  const [claimIntent, setClaimIntent] = useState(false);
  const [claimRole, setClaimRole] = useState<(typeof agencyMemberRoleValues)[number]>("STAFF");
  const [claimRequestNote, setClaimRequestNote] = useState("");
  const [noReferral, setNoReferral] = useState(false);
  const [referredBy, setReferredBy] = useState("");

  const [referralCode, setReferralCode] = useState(referral?.code ?? "");
  const [referralValidation, setReferralValidation] = useState<
    | { status: "idle" }
    | { status: "checking" }
    | { status: "valid"; agencyName: string }
    | { status: "invalid"; reason: string }
  >(referral ? { status: "valid", agencyName: referral.agencyName } : { status: "idle" });
  const arrivedViaLink = Boolean(referral);

  useEffect(() => {
    const trimmed = referralCode.trim();
    if (!trimmed) {
      setReferralValidation({ status: "idle" });
      return;
    }
    setReferralValidation({ status: "checking" });
    const timeout = setTimeout(() => {
      validateReferralCodeAction(trimmed).then((result) => {
        setReferralValidation(
          result.valid ? { status: "valid", agencyName: result.referrerName } : { status: "invalid", reason: result.reason }
        );
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [referralCode]);

  if (state?.success) {
    return (
      <AuthCard variant="light" title="Application submitted" description="Your CreatorHub360 membership is under review.">
        <div className="flex flex-col items-center gap-6 py-2 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative"
          >
            <div className="absolute inset-0 -z-10 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="flex size-16 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-8" />
            </div>
          </motion.div>
          <p className="text-[15px] text-black/60">
            Thank you for applying. Our team reviews every application personally — we&apos;ll email you as soon as
            a decision is made.
          </p>
          <div className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-black/50">
            <Mail className="size-4 shrink-0" />
            <p className="text-sm">Keep an eye on your inbox for next steps.</p>
          </div>
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

  return (
    <AuthCard
      variant="light"
      title="Apply to join CreatorHub360"
      description="Every application is reviewed by our team before access is granted."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-black underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-6 space-y-4">
        <p className="text-[15px] text-black/50">
          Membership gives you a home base to work, collaborate, and grow alongside the CreatorHub360 community.
        </p>
        <div className="flex flex-wrap gap-2">
          {BENEFIT_CHIPS.map((b) => (
            <span
              key={b.label}
              className="flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.02] py-1.5 pr-3 pl-2 text-xs font-medium text-black/60"
            >
              <b.icon className="size-3.5 text-black/40" />
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        {plan && plan.trialMonths > 0 && (
          <AuthBanner variant="light" tone="info">
            🎉 {plan.name} launch offer — {formatCurrency(plan.priceCents / 100)}/mo, first {plan.trialMonths} months
            free for every approved member.
          </AuthBanner>
        )}
        {agencyInvite && (
          <AuthBanner variant="light" tone="info">
            You&apos;ve been invited to join <strong>{agencyInvite.agencyName}</strong> as{" "}
            {agencyInvite.role.charAt(0) + agencyInvite.role.slice(1).toLowerCase()}. Submit this application to
            join automatically once approved.
          </AuthBanner>
        )}
        {message && <AuthBanner variant="light" tone="info">{message}</AuthBanner>}
        {state?.error && (
          <AuthBanner variant="light" tone="error">
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
                <div className="space-y-2 rounded-lg border border-black/10 bg-white/60 p-3">
                  <p className="text-xs text-black/60">
                    Select your role at {state.existingAgencyName}, then submit again — their admins will review
                    your request.
                  </p>
                  <AuthSelect
                    variant="light"
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
                    variant="light"
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
        <input type="hidden" name="agencyInviteToken" value={agencyInvite?.token ?? ""} />
        <input type="hidden" name="role" value={role} />

        <AuthInput
          variant="light"
          label="Full name"
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Jane Creator"
          icon={<User className="size-[18px]" />}
          defaultValue={defaultFullName}
          required
        />

        <AuthInput
          variant="light"
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@creatorhub360.com"
          icon={<Mail className="size-[18px]" />}
          defaultValue={defaultEmail}
          required
        />

        <AuthInput
          variant="light"
          label="Phone number"
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="(555) 123-4567"
          icon={<Phone className="size-[18px]" />}
          required
        />

        <AuthSelect
          variant="light"
          label="Role"
          id="role"
          icon={<Users2 className="size-[18px]" />}
          value={role}
          onChange={(e) => setRole(e.target.value as (typeof APPLICANT_ROLE_VALUES)[number])}
          disabled={Boolean(agencyInvite)}
          required
        >
          {APPLICANT_ROLE_VALUES.map((r) => (
            <option key={r} value={r} className="text-black">
              {ROLE_LABELS[r]}
            </option>
          ))}
        </AuthSelect>

        <AuthInput
          variant="light"
          label={role === "AGENCY" ? "Agency / business name" : "Company (optional)"}
          id="company"
          name="company"
          autoComplete="organization"
          placeholder="Your company or brand"
          icon={<Building2 className="size-[18px]" />}
          required={role === "AGENCY"}
        />

        {role === "AGENCY" && (
          <div className="space-y-5 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
            <p className="text-xs font-medium tracking-wide text-black/40 uppercase">
              {agencyInvite ? "Agency details" : "Agency details — used to prevent duplicate agency records"}
            </p>
            <AuthInput
              variant="light"
              label="Website"
              id="website"
              name="website"
              placeholder="https://youragency.com"
              icon={<Globe className="size-[18px]" />}
            />
            <AuthInput
              variant="light"
              label="Business registration number (optional)"
              id="businessRegistrationNumber"
              name="businessRegistrationNumber"
              placeholder="EIN / registration ID"
              icon={<Hash className="size-[18px]" />}
            />
          </div>
        )}

        <AuthInput
          variant="light"
          label="Instagram"
          id="instagram"
          name="instagram"
          placeholder="https://instagram.com/..."
          icon={<Link2 className="size-[18px]" />}
          required
        />
        <AuthInput
          variant="light"
          label="TikTok"
          id="tiktok"
          name="tiktok"
          placeholder="https://tiktok.com/@..."
          icon={<Link2 className="size-[18px]" />}
          required
        />
        <AuthInput
          variant="light"
          label="YouTube (optional)"
          id="youtube"
          name="youtube"
          placeholder="https://youtube.com/@..."
          icon={<Link2 className="size-[18px]" />}
        />

        <AuthInput
          variant="light"
          label="City"
          id="city"
          name="city"
          autoComplete="address-level2"
          placeholder="Los Angeles"
          icon={<MapPin className="size-[18px]" />}
          required
        />
        <AuthInput
          variant="light"
          label="State / Province"
          id="state"
          name="state"
          autoComplete="address-level1"
          placeholder="California"
          icon={<MapPin className="size-[18px]" />}
          required
        />
        <AuthInput
          variant="light"
          label="Country"
          id="country"
          name="country"
          autoComplete="country-name"
          placeholder="United States"
          icon={<Globe className="size-[18px]" />}
          required
        />

        <AuthInput
          variant="light"
          label="Who referred you?"
          id="referredBy"
          name="referredBy"
          placeholder="Member name, company, or organization"
          icon={<Users2 className="size-[18px]" />}
          value={noReferral ? NO_REFERRAL : referredBy}
          onChange={(e) => setReferredBy(e.target.value)}
          readOnly={noReferral}
          required
        />
        <AuthCheckbox
          variant="light"
          id="noReferral"
          label="No one referred me"
          checked={noReferral}
          onChange={(e) => setNoReferral(e.target.checked)}
        />

        <div className="space-y-2">
          <AuthInput
            variant="light"
            label="Agency ID (optional)"
            id="referralCode"
            name="referralCode"
            placeholder="AGY-001284"
            icon={<QrCode className="size-[18px]" />}
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            readOnly={arrivedViaLink}
          />
          {referralValidation.status === "checking" && (
            <p className="flex items-center gap-1.5 text-xs text-black/40">
              <Loader2 className="size-3.5 animate-spin" /> Checking agency ID...
            </p>
          )}
          {referralValidation.status === "valid" && arrivedViaLink && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="size-3.5" /> Connected to: {referralValidation.agencyName}
            </p>
          )}
          {referralValidation.status === "valid" && !arrivedViaLink && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="size-3.5" /> Found — a request will be sent to {referralValidation.agencyName}{" "}
              for approval once your application is reviewed.
            </p>
          )}
          {referralValidation.status === "invalid" && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <XCircle className="size-3.5" /> {referralValidation.reason}
            </p>
          )}
          <input
            type="hidden"
            name="referralSource"
            value={arrivedViaLink ? "QR_CODE" : referralCode.trim() ? "MANUAL_ENTRY" : ""}
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
          <LegalConsentField
            variant="light"
            id="termsAccepted"
            name="termsAccepted"
            text="I agree to CreatorHub360's"
            links={[{ href: "/legal/terms", label: "Terms & Conditions" }]}
            required
          />
          <LegalConsentField
            variant="light"
            id="privacyAccepted"
            name="privacyAccepted"
            text="I have read and agree to the"
            links={[{ href: "/legal/privacy", label: "Privacy Policy" }]}
            required
          />
          <LegalConsentField
            variant="light"
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

        <AuthSubmitButton variant="light" isPending={isPending}>Submit application</AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
