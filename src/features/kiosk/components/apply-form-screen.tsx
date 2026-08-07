"use client";

import { useActionState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Loader2, User, Mail, Phone, Users2, Link2 } from "lucide-react";
import { submitApplicationAction, type SubmitApplicationState } from "@/features/applications/services/actions";
import { APPLICANT_ROLE_VALUES, ROLE_LABELS } from "@/features/members/role-labels";
import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthSelect } from "@/features/auth/components/auth-select";
import { LegalConsentField } from "@/features/legal/components/legal-consent-field";
import ch360Logo from "../../../../images/Ch360 Logo 3.PNG";

const NO_REFERRAL = "No Referral";

export function ApplyFormScreen({ onSubmitted, onCancel }: { onSubmitted: () => void; onCancel: () => void }) {
  const [state, formAction, isPending] = useActionState<SubmitApplicationState, FormData>(
    submitApplicationAction,
    null
  );
  // Referred By — disabled for now (see the commented-out field below).
  // Keeping this state for future re-enable.
  // const [noReferral, setNoReferral] = useState(false);
  // const [referredBy, setReferredBy] = useState("");

  useEffect(() => {
    if (state?.success) onSubmitted();
  }, [state, onSubmitted]);

  const fieldErrors = state?.fieldErrors;
  // Only show the global banner for failures that couldn't be attributed to
  // a specific field (an unexpected server/database error, or an agency
  // duplicate) — field-level validation errors render inline instead.
  const globalError = state?.error && !fieldErrors ? state.error : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex w-full max-w-xl flex-col gap-8 rounded-[32px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.1)] sm:p-8"
    >
      <form action={formAction} className="space-y-6 overflow-y-auto">
        <Image
          src={ch360Logo}
          alt="CreatorHub360 Logo"
          width={120}
          height={120}
          className="mx-auto h-[80px] w-[80px] rounded-2xl object-contain sm:h-[96px] sm:w-[96px] lg:h-[120px] lg:w-[120px]"
        />

        <h1 className="text-4xl font-semibold tracking-tight text-balance text-center text-black">Welcome to CreatorHub360</h1>

        <div className="space-y-4">
          <AuthInput
            variant="light"
            label="Full Name"
            id="fullName"
            name="fullName"
            autoComplete="name"
            icon={<User className="size-[18px]" />}
            error={fieldErrors?.fullName}
            required
          />

          <AuthInput
            variant="light"
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            icon={<Mail className="size-[18px]" />}
            error={fieldErrors?.email}
            required
          />

          <AuthInput
            variant="light"
            label="Phone"
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            icon={<Phone className="size-[18px]" />}
            error={fieldErrors?.phone}
            required
          />

          <AuthSelect
            variant="light"
            label="Role"
            id="role"
            name="role"
            icon={<Users2 className="size-[18px]" />}
            defaultValue="CREATOR"
            error={fieldErrors?.role}
            required
          >
            {APPLICANT_ROLE_VALUES.map((role) => (
              <option key={role} value={role} className="text-black">
                {ROLE_LABELS[role]}
              </option>
            ))}
          </AuthSelect>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AuthInput
              variant="light"
              label="Instagram"
              id="instagram"
              name="instagram"
              icon={<Link2 className="size-[18px]" />}
              error={fieldErrors?.instagram}
              required
            />
            <AuthInput
              variant="light"
              label="TikTok"
              id="tiktok"
              name="tiktok"
              icon={<Link2 className="size-[18px]" />}
              error={fieldErrors?.tiktok}
              required
            />
            <AuthInput
              variant="light"
              label="YouTube (optional)"
              id="youtube"
              name="youtube"
              icon={<Link2 className="size-[18px]" />}
              error={fieldErrors?.youtube}
            />
          </div>

          {/* Referred By
              Disabled for now.
              Keep this component for future referral functionality.
          <AuthInput
            variant="light"
            label="Who Referred You?"
            id="referredBy"
            name="referredBy"
            placeholder="Name of member, company, or organization"
            icon={<Users2 className="size-[18px]" />}
            value={noReferral ? NO_REFERRAL : referredBy}
            onChange={(e) => !noReferral && setReferredBy(e.target.value)}
            readOnly={noReferral}
            error={fieldErrors?.referredBy}
            required
          />
          <AuthCheckbox
            variant="light"
            id="noReferral"
            label="No one referred me"
            checked={noReferral}
            onChange={(e) => setNoReferral(e.target.checked)}
          />
          */}
          <input type="hidden" name="referredBy" value={NO_REFERRAL} />

          <div className="space-y-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
            <LegalConsentField
              variant="light"
              id="termsAccepted"
              name="termsAccepted"
              text="I agree to CreatorHub360's"
              links={[{ href: "/legal/terms", label: "Terms & Conditions" }]}
              required
            />
            {fieldErrors?.termsAccepted && <p className="text-sm text-destructive">{fieldErrors.termsAccepted}</p>}
            <LegalConsentField
              variant="light"
              id="privacyAccepted"
              name="privacyAccepted"
              text="I have read and agree to the"
              links={[{ href: "/legal/privacy", label: "Privacy Policy" }]}
              required
            />
            {fieldErrors?.privacyAccepted && <p className="text-sm text-destructive">{fieldErrors.privacyAccepted}</p>}
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
            {fieldErrors?.mediaReleaseAccepted && (
              <p className="text-sm text-destructive">{fieldErrors.mediaReleaseAccepted}</p>
            )}
          </div>

          {globalError && <p className="text-center text-base text-red-600">{globalError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="flex min-h-14 flex-1 items-center justify-center rounded-2xl border border-black/10 text-lg font-medium text-black outline-none transition-colors hover:bg-black/[0.03] active:bg-black/[0.06] focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-black text-lg font-semibold text-white outline-none transition-transform active:scale-[0.98] disabled:opacity-60 focus-visible:ring-4 focus-visible:ring-black/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            >
              {isPending && <Loader2 className="size-5 animate-spin" />}
              Submit Application
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
