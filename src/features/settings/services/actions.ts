"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { EmailService } from "@/lib/email/email-service";
import {
  profileSchema,
  collabProfileSchema,
  settingsProfileSchema,
  passwordChangeSchema,
  emailChangeSchema,
  notificationPrefsSchema,
  type ProfileInput,
  type CollabProfileInput,
  type SettingsProfileInput,
  type PasswordChangeInput,
  type EmailChangeInput,
  type NotificationPrefsInput,
} from "@/features/settings/schemas/settings.schema";
import { instagramUrl, tiktokUrl, youtubeUrl, linkedinUrl } from "@/lib/utils/social-links";

export type SettingsActionResult = { success: true } | { success: false; error: string };

export async function updateOwnProfile(input: ProfileInput): Promise<SettingsActionResult> {
  const actor = await requireCurrentMember();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await prisma.member.update({
      where: { id: actor.id },
      data: {
        fullName: parsed.data.fullName,
        username: parsed.data.username || null,
        displayName: parsed.data.displayName || null,
        phone: parsed.data.phone || null,
        website: parsed.data.website || null,
        location: parsed.data.location || null,
        bio: parsed.data.bio || null,
        profilePhotoUrl: parsed.data.profilePhotoUrl || null,
        bannerImageUrl: parsed.data.bannerImageUrl || null,
      },
    });
  } catch (err) {
    // Member.username has a @unique constraint — Prisma throws P2002 rather
    // than returning a validatable result, so this is the only place a
    // "someone already has that handle" error can be caught.
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return { success: false, error: "That username is already taken." };
    }
    throw err;
  }

  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * The Settings Profile tab's single save action — personal info + Collab
 * Hub preferences in one Prisma update, so the tab needs only one Save
 * button. See settingsProfileSchema's doc comment for which fields
 * round-trip without being editable in this particular form.
 */
export async function updateSettingsProfile(input: SettingsProfileInput): Promise<SettingsActionResult> {
  const actor = await requireCurrentMember();

  const parsed = settingsProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const skills = (parsed.data.skills ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await prisma.member.update({
      where: { id: actor.id },
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || null,
        website: parsed.data.website || null,
        location: parsed.data.location || null,
        bio: parsed.data.bio || null,
        profilePhotoUrl: parsed.data.profilePhotoUrl || null,
        skills,
        contentCategories: parsed.data.contentCategories,
        lookingFor: parsed.data.lookingFor || null,
        instagramUrl: instagramUrl(parsed.data.instagramUrl),
        tiktokUrl: tiktokUrl(parsed.data.tiktokUrl),
        youtubeUrl: youtubeUrl(parsed.data.youtubeUrl),
        linkedinUrl: linkedinUrl(parsed.data.linkedinUrl),
        availableForCollab: parsed.data.availableForCollab,
        visibleInDirectory: parsed.data.visibleInDirectory,
        username: parsed.data.username || null,
        displayName: parsed.data.displayName || null,
        bannerImageUrl: parsed.data.bannerImageUrl || null,
      },
    });
  } catch (err) {
    // Member.username has a @unique constraint — Prisma throws P2002 rather
    // than returning a validatable result, so this is the only place a
    // "someone already has that handle" error can be caught.
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return { success: false, error: "That username is already taken." };
    }
    throw err;
  }

  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/collab-hub");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateCollabProfile(input: CollabProfileInput): Promise<SettingsActionResult> {
  const actor = await requireCurrentMember();

  const parsed = collabProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const skills = (parsed.data.skills ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.member.update({
    where: { id: actor.id },
    data: {
      skills,
      contentCategories: parsed.data.contentCategories,
      lookingFor: parsed.data.lookingFor || null,
      instagramUrl: instagramUrl(parsed.data.instagramUrl),
      tiktokUrl: tiktokUrl(parsed.data.tiktokUrl),
      youtubeUrl: youtubeUrl(parsed.data.youtubeUrl),
      linkedinUrl: linkedinUrl(parsed.data.linkedinUrl),
      availableForCollab: parsed.data.availableForCollab,
      visibleInDirectory: parsed.data.visibleInDirectory,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/collab-hub");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Supabase's updateUser() doesn't itself re-verify the caller's current
 * password for an already-authenticated session — so "require current
 * password" is implemented as a real re-authentication call first, and the
 * password is only changed if that succeeds.
 */
export async function changePassword(input: PasswordChangeInput): Promise<SettingsActionResult> {
  const actor = await requireCurrentMember();
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: actor.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) return { success: false, error: "Current password is incorrect." };

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (updateError) return { success: false, error: updateError.message };

  await EmailService.sendPasswordChangedEmail({
    to: actor.email,
    fullName: actor.fullName,
    organizationId: actor.organizationId,
    memberId: actor.id,
  });

  return { success: true };
}

/**
 * Same re-authentication requirement as changePassword. Supabase's own
 * confirmation-email flow gates the actual change — Member.email is
 * deliberately left untouched here; see getCurrentMember()'s reconciliation
 * step for how it catches up once the user confirms.
 */
export async function changeEmail(input: EmailChangeInput): Promise<SettingsActionResult> {
  const actor = await requireCurrentMember();
  const parsed = emailChangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: actor.email,
    password: parsed.data.confirmPassword,
  });
  if (reauthError) return { success: false, error: "Password is incorrect." };

  const { error: updateError } = await supabase.auth.updateUser({ email: parsed.data.newEmail });
  if (updateError) return { success: false, error: updateError.message };

  // updateUser() above is still what actually starts Supabase's
  // double-opt-in email-change flow server-side; this only replaces which
  // confirmation email the user sees with our own branded one, generated via
  // the admin API so no separate Supabase-sent email goes out from this call.
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "email_change_new",
      email: actor.email,
      newEmail: parsed.data.newEmail,
      options: { redirectTo: `${appUrl}/auth/callback` },
    });
    if (!error && data.properties?.action_link) {
      await EmailService.sendEmailChangedEmail({
        to: parsed.data.newEmail,
        fullName: actor.fullName,
        newEmail: parsed.data.newEmail,
        confirmUrl: data.properties.action_link,
        organizationId: actor.organizationId,
        memberId: actor.id,
      });
    }
  }

  return { success: true };
}

export async function updateNotificationPreferences(input: NotificationPrefsInput): Promise<SettingsActionResult> {
  const actor = await requireCurrentMember();
  const parsed = notificationPrefsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.member.update({
    where: { id: actor.id },
    data: parsed.data,
  });

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Defense-in-depth: the Developer Tools section only renders for actors with
 * dev_tools.access, but a server action is independently callable, so the
 * role is re-checked here rather than trusting the UI-level permission gate.
 */
export async function updateDemoMode(enabled: boolean): Promise<SettingsActionResult> {
  const actor = await requireCurrentMember();

  if (actor.systemRole !== "SUPER_ADMIN") {
    return { success: false, error: "Only Super Admins can change this setting." };
  }

  await prisma.member.update({
    where: { id: actor.id },
    data: { demoModeEnabled: enabled },
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}
