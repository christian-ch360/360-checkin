"use server";

import { applicationSchema } from "@/features/applications/schemas/application.schema";
import { submitApplication } from "@/features/applications/services/applications.service";
import { AgencyDuplicateError } from "@/features/agencies/services/agency-duplicate.service";

export type SubmitApplicationState =
  | { error?: string; success?: boolean; existingAgencyId?: string; existingAgencyName?: string }
  | null;

/**
 * Public, unauthenticated — same trust model as visitor registration and
 * the kiosk. Never creates a Supabase user, Member, or QR asset; only ever
 * writes a MembershipApplication row (see submitApplication).
 */
export async function submitApplicationAction(
  _prevState: SubmitApplicationState,
  formData: FormData
): Promise<SubmitApplicationState> {
  const parsed = applicationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    company: formData.get("company"),
    website: formData.get("website"),
    businessRegistrationNumber: formData.get("businessRegistrationNumber"),
    instagram: formData.get("instagram"),
    tiktok: formData.get("tiktok"),
    youtube: formData.get("youtube"),
    city: formData.get("city"),
    state: formData.get("state"),
    country: formData.get("country"),
    reason: formData.get("reason"),
    referredBy: formData.get("referredBy"),
    referralCode: formData.get("referralCode"),
    referralSource: formData.get("referralSource") || undefined,
    claimAgencyId: formData.get("claimAgencyId"),
    claimAgencyRole: formData.get("claimAgencyRole") || undefined,
    agencyInviteToken: formData.get("agencyInviteToken"),
    termsAccepted: formData.get("termsAccepted") === "on" || formData.get("termsAccepted") === "true",
    privacyAccepted: formData.get("privacyAccepted") === "on" || formData.get("privacyAccepted") === "true",
    dataProcessingAccepted:
      formData.get("dataProcessingAccepted") === "on" || formData.get("dataProcessingAccepted") === "true",
    mediaReleaseAccepted:
      formData.get("mediaReleaseAccepted") === "on" || formData.get("mediaReleaseAccepted") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await submitApplication(parsed.data);
  } catch (err) {
    if (err instanceof AgencyDuplicateError) {
      return { error: err.message, existingAgencyId: err.existingAgencyId, existingAgencyName: err.existingAgencyName };
    }
    console.error("submitApplicationAction: failed to save application:", err);
    return { error: "Something went wrong submitting your application. Please try again." };
  }

  return { success: true };
}
