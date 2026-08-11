"use server";

import { applicationSchema } from "@/features/applications/schemas/application.schema";
import { submitApplication } from "@/features/applications/services/applications.service";
import { AgencyDuplicateError } from "@/features/agencies/services/agency-duplicate.service";
import { EmailConflictError } from "@/features/members/services/email-lookup.service";
import { Prisma } from "@prisma/client";

export type FieldErrors = Record<string, string>;

export type SubmitApplicationState =
  | {
      error?: string;
      fieldErrors?: FieldErrors;
      success?: boolean;
      existingAgencyId?: string;
      existingAgencyName?: string;
    }
  | null;

/**
 * `FormData.get(name)` returns `null` when no control with that name exists
 * in the submitted form at all (as opposed to `""` for an empty control).
 * The plain-string-optional fields below use the Zod pattern
 * `.optional().or(z.literal(""))`, which only accepts `undefined` or `""` —
 * NOT `null` (Zod v4's `.optional()` is `undefined`-only). Forms that omit
 * one of these fields entirely (e.g. the single-page kiosk form) would
 * otherwise send `null` straight into that union and fail both branches,
 * surfacing Zod's generic top-level union message ("Invalid input") instead
 * of a real error. Coalescing to `""` here keeps every submitting form —
 * regardless of which optional fields it renders — on the same accepted
 * input shape.
 */
function optionalStringField(formData: FormData, name: string): string {
  return (formData.get(name) as string | null) ?? "";
}

/**
 * Public, unauthenticated — same trust model as visitor registration and
 * the kiosk. Never creates a Supabase user, Member, or QR asset; only ever
 * writes a MembershipApplication row (see submitApplication).
 */
export async function submitApplicationAction(
  _prevState: SubmitApplicationState,
  formData: FormData
): Promise<SubmitApplicationState> {
  const rawValues = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    company: optionalStringField(formData, "company"),
    website: optionalStringField(formData, "website"),
    businessRegistrationNumber: optionalStringField(formData, "businessRegistrationNumber"),
    instagram: formData.get("instagram"),
    tiktok: formData.get("tiktok"),
    youtube: optionalStringField(formData, "youtube"),
    city: optionalStringField(formData, "city"),
    state: optionalStringField(formData, "state"),
    country: optionalStringField(formData, "country"),
    referredBy: formData.get("referredBy"),
    referralCode: optionalStringField(formData, "referralCode"),
    referralSource: formData.get("referralSource") || undefined,
    claimAgencyId: optionalStringField(formData, "claimAgencyId"),
    claimAgencyRole: formData.get("claimAgencyRole") || undefined,
    claimRequestNote: optionalStringField(formData, "claimRequestNote"),
    agencyInviteToken: optionalStringField(formData, "agencyInviteToken"),
    termsAccepted: formData.get("termsAccepted") === "on" || formData.get("termsAccepted") === "true",
    privacyAccepted: formData.get("privacyAccepted") === "on" || formData.get("privacyAccepted") === "true",
    mediaReleaseAccepted:
      formData.get("mediaReleaseAccepted") === "on" || formData.get("mediaReleaseAccepted") === "true",
  };
  console.log("[submitApplicationAction] FORM VALUES", rawValues);

  const parsed = applicationSchema.safeParse(rawValues);

  if (!parsed.success) {
    console.log("[submitApplicationAction] VALIDATION FAILED", parsed.error.issues);
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: parsed.error.issues[0]?.message, fieldErrors };
  }
  console.log("[submitApplicationAction] VALIDATION OK", parsed.data);

  try {
    console.log("[submitApplicationAction] SERVER PAYLOAD", parsed.data);
    await submitApplication(parsed.data);
  } catch (err) {
    if (err instanceof AgencyDuplicateError) {
      console.log("[submitApplicationAction] AGENCY DUPLICATE", err.message);
      return { error: err.message, existingAgencyId: err.existingAgencyId, existingAgencyName: err.existingAgencyName };
    }

    if (err instanceof EmailConflictError) {
      return { error: err.message, fieldErrors: { email: err.message } };
    }

    console.error("[submitApplicationAction] DATABASE ERROR", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : String(err.meta?.target ?? "field");
        return { error: `An application with this ${target} already exists.` };
      }
      if (err.code === "P2003") {
        return { error: "Referral ID does not exist." };
      }
      if (err.code === "P2011" || err.code === "P2012") {
        return { error: `Missing required field "${err.meta?.target ?? "unknown"}".` };
      }
      return { error: `Database error (${err.code}). Please try again or contact support.` };
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
      return { error: "The application could not be saved due to a data validation error. Please contact support." };
    }

    return { error: "Something went wrong submitting your application. Please try again." };
  }

  return { success: true };
}
