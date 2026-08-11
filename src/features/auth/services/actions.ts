"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  loginSchema,
  signupSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
} from "@/features/auth/schemas/auth.schema";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/db/prisma";
import { EmailService } from "@/lib/email/email-service";
import { createMemberFromSignup } from "@/features/auth/services/signup-application";
import { AgencyDuplicateError } from "@/features/agencies/services/agency-duplicate.service";
import { findEmailConflict, GENERIC_EMAIL_TAKEN_MESSAGE } from "@/features/members/services/email-lookup.service";
import { getValidInvitation } from "@/features/admin/services/invitations.service";
import { isUniqueConstraintErrorOnField } from "@/features/members/services/member-number";
import { sanitizeRedirectPath } from "@/lib/utils/safe-redirect";

export type AuthActionState = {
  error?: string;
  success?: boolean;
  /** Set on signup's error response when the error is an Agency Uniqueness duplicate — powers
   * the "Request Access to Existing Agency" UI in signup-form.tsx. */
  existingAgencyId?: string;
  existingAgencyName?: string;
} | null;

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(sanitizeRedirectPath(formData.get("redirectTo")?.toString()) ?? "/dashboard");
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    phone: formData.get("phone"),
    companyName: formData.get("companyName"),
    appliedRole: formData.get("appliedRole"),
    bio: formData.get("bio"),
    instagramUrl: formData.get("instagramUrl"),
    tiktokUrl: formData.get("tiktokUrl"),
    youtubeUrl: formData.get("youtubeUrl"),
    linkedinUrl: formData.get("linkedinUrl"),
    followerCount: formData.get("followerCount"),
    platforms: formData.get("platforms"),
    agencyCode: formData.get("agencyCode"),
    website: formData.get("website"),
    businessRegistrationNumber: formData.get("businessRegistrationNumber"),
    claimAgencyId: formData.get("claimAgencyId"),
    claimAgencyRole: formData.get("claimAgencyRole") || undefined,
    claimRequestNote: formData.get("claimRequestNote"),
    inviteToken: formData.get("inviteToken"),
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

  // Public self-service signup no longer exists — this action only ever
  // completes an admin invitation now (see signup/page.tsx's redirect to
  // /apply for anyone without one). Re-validated server-side regardless of
  // what the client claimed, since a stale/expired/tampered token, or one
  // whose email doesn't match what was actually submitted, must not be
  // silently treated as "proceed anyway."
  let invitation = null;
  if (parsed.data.inviteToken) {
    const candidate = await getValidInvitation(parsed.data.inviteToken);
    if (candidate && candidate.email.toLowerCase() === parsed.data.email.toLowerCase()) {
      invitation = candidate;
    }
  }
  if (!invitation) {
    return { error: "This invite link is invalid or has expired. Please request a new invitation, or apply at /apply." };
  }

  // "Sign up should never create multiple accounts with the same email" —
  // checked before the Supabase auth user is even created, so a collision
  // never leaves behind an orphaned auth user with no Member row. Uses the
  // generic Public Registration message (never reveals whether the email
  // belongs to a member, a pending application, or a rejected one).
  const emailConflict = await findEmailConflict(invitation.organizationId, parsed.data.email);
  if (emailConflict) {
    return { error: GENERIC_EMAIL_TAKEN_MESSAGE };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabaseAdmin = getSupabaseAdmin();

  let authUserId: string;
  let verifyUrl: string | null = null;

  if (supabaseAdmin) {
    // Admin-generated links never trigger Supabase's own confirmation email
    // (only signUp/resetPasswordForEmail/updateUser do) — this both creates
    // the auth user and hands back a link we embed in our own branded email.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        redirectTo: `${appUrl}/auth/callback`,
      },
    });
    if (error || !data.user) {
      return { error: error?.message ?? "Something went wrong creating your account. Please try again." };
    }
    authUserId = data.user.id;
    verifyUrl = data.properties.action_link;
  } else {
    // SUPABASE_SERVICE_ROLE_KEY isn't configured — fall back to Supabase's
    // own signup + confirmation email rather than leaving the user stuck.
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.fullName } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Something went wrong creating your account. Please try again." };
    authUserId = data.user.id;
  }

  let member;
  try {
    member = await createMemberFromSignup(authUserId, parsed.data, invitation);
  } catch (err) {
    if (err instanceof AgencyDuplicateError) {
      return { error: err.message, existingAgencyId: err.existingAgencyId, existingAgencyName: err.existingAgencyName };
    }
    // Race-condition backstop — the proactive check above already catches
    // this in the normal case, so this only fires if two signups for the
    // same email landed at nearly the same instant.
    if (isUniqueConstraintErrorOnField(err, "email")) {
      return { error: GENERIC_EMAIL_TAKEN_MESSAGE };
    }
    console.error("signupAction: failed to create member record:", err);
    return {
      error:
        "Your account was created but we couldn't save your application details. Please contact support.",
    };
  }

  if (verifyUrl) {
    await EmailService.sendVerifyEmailEmail({
      to: member.email,
      fullName: member.fullName,
      verifyUrl,
      organizationId: member.organizationId,
      memberId: member.id,
      priority: "critical",
    });
  }

  const message = "Check your email to confirm your account. Your invitation has been accepted — you're all set.";
  redirect(`/login?message=${encodeURIComponent(message)}`);
}

export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: error.message };
  }

  // Recovery sessions are meant to be used once, for this one action — sign out
  // so the user comes back through a normal login with their new password
  // rather than silently staying authenticated on the recovery session.
  await supabase.auth.signOut();

  return { success: true };
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Points straight at /reset-password rather than through /auth/callback.
  // Supabase's default recovery email delivers the session via a URL hash
  // fragment (#access_token=...), which a server Route Handler can never see —
  // it has to land on an actual client-rendered page that can read
  // window.location itself. /reset-password's client code also handles the
  // ?code= (PKCE) and ?token_hash=&type= shapes, in case the project's email
  // template is ever customized to use one of those instead.
  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    // Look the member up first — admin.generateLink errors for an email with
    // no Supabase user, and we must not let that (or its absence) leak
    // whether the address is registered, so a miss here just sends nothing.
    const member = await prisma.member.findUnique({ where: { email: parsed.data.email } });
    if (member) {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: parsed.data.email,
        options: { redirectTo: `${appUrl}/reset-password` },
      });
      if (!error && data.properties?.action_link) {
        await EmailService.sendPasswordResetEmail({
          to: member.email,
          fullName: member.fullName,
          resetUrl: data.properties.action_link,
          organizationId: member.organizationId,
          memberId: member.id,
          priority: "critical",
        });
      }
    }
  } else {
    // SUPABASE_SERVICE_ROLE_KEY isn't configured — fall back to Supabase's
    // own recovery email rather than leaving the user stuck.
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${appUrl}/reset-password`,
    });
  }

  // Always the same message regardless of whether the email is registered —
  // don't let this form be used to enumerate accounts.
  redirect("/login?message=If that email is registered, a reset link is on its way.");
}

// Only "google"/"apple" are wired to buttons -- and are the only ones
// Supabase's own Provider union actually supports as built-in OAuth today
// (no "tiktok"/"instagram" exist there; those would need a custom OIDC
// provider configured in the Supabase dashboard before this type could
// honestly include them). This function's signature otherwise needs no
// change to add a third built-in provider later -- just a new button.
export type OAuthProvider = "google" | "apple";

export async function signInWithOAuthProvider(provider: OAuthProvider, redirectTo?: string) {
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const next = sanitizeRedirectPath(redirectTo);
  const callbackUrl = `${appUrl}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl },
  });

  if (error || !data.url) {
    redirect(`/login?message=${encodeURIComponent(error?.message ?? "Could not start sign-in")}`);
  }

  redirect(data.url);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
