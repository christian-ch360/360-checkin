"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  QrCode,
  TrendingUp,
  DoorOpen,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Users2,
  Building2,
  Link2,
  MapPin,
  Globe,
} from "lucide-react";
import { submitApplicationAction, type SubmitApplicationState } from "@/features/applications/services/actions";
import { APPLICANT_ROLE_VALUES, ROLE_LABELS } from "@/features/members/role-labels";
import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthSelect } from "@/features/auth/components/auth-select";
import { AuthTextarea } from "@/features/auth/components/auth-textarea";
import { AuthCheckbox } from "@/features/auth/components/auth-checkbox";
import { LegalConsentField } from "@/features/legal/components/legal-consent-field";
import { ApplyProgress } from "@/features/kiosk/components/apply-progress";

const NO_REFERRAL = "No Referral";

const BENEFITS = [
  { icon: QrCode, title: "Check in, in seconds", description: "One QR scan clocks you into the building — kiosk, badge, or app." },
  { icon: TrendingUp, title: "GMV and commission, live", description: "Every sale attributed to you automatically, tracked in real time." },
  { icon: DoorOpen, title: "Spaces that book themselves", description: "Studios and rooms, ready when you need them." },
];

export function ApplyFormScreen({ onSubmitted, onCancel }: { onSubmitted: () => void; onCancel: () => void }) {
  const [state, formAction, isPending] = useActionState<SubmitApplicationState, FormData>(
    submitApplicationAction,
    null
  );
  const [step, setStep] = useState(1);
  const [noReferral, setNoReferral] = useState(false);
  const [referredBy, setReferredBy] = useState("");
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.success) onSubmitted();
  }, [state, onSubmitted]);

  function goNext(fromStep: number, ref: React.RefObject<HTMLDivElement | null>) {
    const invalid = ref.current?.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid");
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setStep(fromStep + 1);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex w-full max-w-xl flex-col gap-8 rounded-[32px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.1)] sm:p-8"
    >
      <ApplyProgress step={step} />

      <form action={formAction} className="space-y-6 overflow-y-auto">
        {/* Step 1 — Welcome */}
        <div className={step === 1 ? "space-y-8 text-center" : "hidden"}>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-balance text-black">Welcome to CreatorHub360</h1>
            <p className="text-lg text-black/50 text-balance">
              CreatorHub360 membership gives you a home base to work, collaborate, and grow — reviewed and approved
              by our team so the community stays high quality.
            </p>
          </div>

          <div className="space-y-4 text-left">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex items-start gap-4 rounded-2xl border border-black/10 bg-black/[0.02] p-4"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-black/70">
                  <b.icon className="size-5" />
                </div>
                <div>
                  <p className="text-base font-medium text-black">{b.title}</p>
                  <p className="text-sm text-black/50">{b.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-14 flex-1 rounded-2xl border border-black/10 text-lg font-medium text-black outline-none transition-colors hover:bg-black/[0.03] active:bg-black/[0.06] focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex min-h-14 flex-[2] items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white outline-none transition-transform active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-black/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Step 2 — About You */}
        <div ref={step2Ref} className={step === 2 ? "space-y-4" : "hidden"}>
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-black">About You</h2>
            <p className="text-black/50">Tell us who you are.</p>
          </div>

          <AuthInput
            variant="light"
            label="Full Name"
            id="fullName"
            name="fullName"
            autoComplete="name"
            icon={<User className="size-[18px]" />}
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
            required
          />

          <AuthSelect
            variant="light"
            label="Role"
            id="role"
            name="role"
            icon={<Users2 className="size-[18px]" />}
            defaultValue="CREATOR"
            required
          >
            {APPLICANT_ROLE_VALUES.map((role) => (
              <option key={role} value={role} className="text-black">
                {ROLE_LABELS[role]}
              </option>
            ))}
          </AuthSelect>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-black/10 text-lg font-medium text-black outline-none transition-colors hover:bg-black/[0.03] active:bg-black/[0.06] focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            >
              <ArrowLeft className="size-5" />
              Back
            </button>
            <button
              type="button"
              onClick={() => goNext(2, step2Ref)}
              className="flex min-h-14 flex-[2] items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white outline-none transition-transform active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-black/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            >
              Continue
            </button>
          </div>
        </div>

        {/* Step 3 — Details */}
        <div ref={step3Ref} className={step === 3 ? "space-y-4" : "hidden"}>
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-black">A Few More Details</h2>
            <p className="text-black/50">All optional — but it helps us review faster.</p>
          </div>

          <AuthInput
            variant="light"
            label="Company (optional)"
            id="company"
            name="company"
            autoComplete="organization"
            icon={<Building2 className="size-[18px]" />}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AuthInput variant="light" label="Instagram" id="instagram" name="instagram" icon={<Link2 className="size-[18px]" />} required />
            <AuthInput variant="light" label="TikTok" id="tiktok" name="tiktok" icon={<Link2 className="size-[18px]" />} required />
            <AuthInput variant="light" label="YouTube (optional)" id="youtube" name="youtube" icon={<Link2 className="size-[18px]" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AuthInput
              variant="light"
              label="City"
              id="city"
              name="city"
              autoComplete="address-level2"
              icon={<MapPin className="size-[18px]" />}
              required
            />
            <AuthInput
              variant="light"
              label="State / Province"
              id="state"
              name="state"
              autoComplete="address-level1"
              icon={<MapPin className="size-[18px]" />}
              required
            />
            <AuthInput
              variant="light"
              label="Country"
              id="country"
              name="country"
              autoComplete="country-name"
              icon={<Globe className="size-[18px]" />}
              required
            />
          </div>

          <AuthTextarea
            variant="light"
            label="Reason for Joining"
            id="reason"
            name="reason"
            minLength={20}
            maxLength={1000}
            required
          />

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
            required
          />
          <AuthCheckbox
            variant="light"
            id="noReferral"
            label="No one referred me"
            checked={noReferral}
            onChange={(e) => setNoReferral(e.target.checked)}
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
              id="dataProcessingAccepted"
              name="dataProcessingAccepted"
              text="I consent to the collection and processing of my personal data as described in the"
              links={[{ href: "/legal/privacy#data-processing", label: "Privacy Policy" }]}
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

          {state?.error && <p className="text-center text-base text-red-600">{state.error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={isPending}
              className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-black/10 text-lg font-medium text-black outline-none transition-colors hover:bg-black/[0.03] active:bg-black/[0.06] focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            >
              <ArrowLeft className="size-5" />
              Back
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
