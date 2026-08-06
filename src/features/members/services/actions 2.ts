"use server";

import { revalidatePath } from "next/cache";
import type { MemberRole, SystemRole } from "@prisma/client";
import { memberSchema, adminAssignableRoleValues, type MemberInput } from "@/features/members/schemas/member.schema";
import { generateMemberNumber, isUniqueConstraintError } from "@/features/members/services/member-number";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/db/activity-log";
import { logAudit } from "@/lib/db/audit-log";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { canEditMemberProfile, canDeleteMember, canInviteWithRole } from "@/lib/permissions/member-rules";
import { isLastSuperAdmin } from "@/lib/db/member-role-guards";
import { provisionMemberOnboarding } from "@/features/members/services/onboarding";
import { uploadAvatarFile } from "@/lib/supabase/storage";
import { instagramUrl, tiktokUrl, youtubeUrl, linkedinUrl } from "@/lib/utils/social-links";
import { checkAgencyDuplicate } from "@/features/agencies/services/agency-duplicate.service";
import { isReferralEligibleRole } from "@/features/referrals/config/referral-config";
import { assertOwnershipSafe, resolveMemberAgencyContext } from "@/features/agencies/services/agency-team.service";
import { isAgencyAdmin } from "@/features/agencies/services/agency-access.service";

const ALLOWED_PHOTO_TYPES = ["image/webp", "image/jpeg", "image/png"];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB — the client crops/compresses before upload, this is a sanity cap

export type UploadPhotoResult = { success: true; photoUrl: string } | { success: false; error: string };

export type MemberActionResult =
  | { success: true; memberId: string; onboardingNote?: string }
  | { success: false; error: string; existingAgencyId?: string };

function isAdminAssignableRole(role: MemberInput["role"]): role is (typeof adminAssignableRoleValues)[number] {
  return (adminAssignableRoleValues as readonly string[]).includes(role);
}

export async function createMember(input: MemberInput): Promise<MemberActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    return { success: false, error: "You don't have permission to add members." };
  }

  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // The Role dropdown offers "Admin"/"Super Admin" only to Super Admins on
  // the client, but the server is the actual gate — reject regardless of
  // what the request contains. Reuses the same rule the invite flow already
  // enforces (RESTRICTED_INVITE_ROLES/roles.manage) so both paths agree.
  if (isAdminAssignableRole(data.role)) {
    const roleCheck = canInviteWithRole(actor.systemRole, data.role);
    if (!roleCheck.allowed) {
      return { success: false, error: roleCheck.reason! };
    }
  }

  const memberRole: MemberRole = isAdminAssignableRole(data.role) ? "STAFF" : data.role;
  const systemRole: SystemRole | undefined = isAdminAssignableRole(data.role) ? data.role : undefined;

  // "Agency Uniqueness" — checked before any Member row is created. No-ops
  // for non-referral-eligible roles.
  const duplicateCheck = await checkAgencyDuplicate(actor.organizationId, memberRole, {
    businessName: data.fullName,
    website: data.website,
    businessRegistrationNumber: data.businessRegistrationNumber,
  });
  if (duplicateCheck.duplicate) {
    return {
      success: false,
      error: `This agency already exists in CreatorHub360 (matches "${duplicateCheck.matches[0].existingAgency.fullName}").`,
      existingAgencyId: duplicateCheck.matches[0].existingAgency.id,
    };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const memberNumber = await generateMemberNumber();
    try {
      const member = await prisma.member.create({
        data: {
          organizationId: actor.organizationId,
          memberNumber,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone || null,
          role: memberRole,
          systemRole,
          status: data.status,
          companyId: data.companyId || null,
          commissionTierId: data.commissionTierId || null,
          referralSource: data.referralSource || null,
          website: data.website || null,
          businessRegistrationNumber: data.businessRegistrationNumber || null,
          // "Every agency must always have at least one OWNER" — a
          // brand-new canonical agency identity starts as its own Owner.
          agencyRole: isReferralEligibleRole(memberRole) ? "OWNER" : undefined,
        },
      });

      await logActivity({
        organizationId: actor.organizationId,
        memberId: actor.id,
        action: "member.created",
        entityType: "member",
        entityId: member.id,
        metadata: { fullName: member.fullName },
      });
      await logAudit({
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "member.created",
        entityType: "member",
        entityId: member.id,
        after: {
          fullName: member.fullName,
          email: member.email,
          role: member.role,
          systemRole: member.systemRole,
          status: member.status,
        },
      });

      const { onboardingNote } = await provisionMemberOnboarding(member, { actorId: actor.id });

      revalidatePath("/members");
      return { success: true, memberId: member.id, onboardingNote };
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < 2) continue;
      if (isUniqueConstraintError(error)) {
        return { success: false, error: "That email is already registered." };
      }
      throw error;
    }
  }

  return { success: false, error: "Could not create member. Please try again." };
}

export async function updateMember(
  memberId: string,
  input: MemberInput
): Promise<MemberActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    return { success: false, error: "You don't have permission to edit members." };
  }

  const before = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!before) return { success: false, error: "Member not found." };

  if (!canEditMemberProfile(actor.systemRole, before.systemRole)) {
    return { success: false, error: "Only Super Admins can edit a Super Admin's profile." };
  }

  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Editing an existing member's Role never grants Admin/Super Admin — that's
  // the dedicated Permissions card (updateMemberSystemRole), which carries
  // its own last-Super-Admin/self-demotion guards. Reject here regardless of
  // what the request contains.
  if (isAdminAssignableRole(data.role)) {
    return { success: false, error: "Use the Permissions section to change a member's system role." };
  }

  try {
    await prisma.member.update({
      where: { id: memberId, organizationId: actor.organizationId },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        status: data.status,
        companyId: data.companyId || null,
        commissionTierId: data.commissionTierId || null,
        referralSource: data.referralSource || null,
        instagramUrl: instagramUrl(data.instagramUrl),
        tiktokUrl: tiktokUrl(data.tiktokUrl),
        youtubeUrl: youtubeUrl(data.youtubeUrl),
        linkedinUrl: linkedinUrl(data.linkedinUrl),
        website: data.website || null,
        businessRegistrationNumber: data.businessRegistrationNumber || null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "That email is already registered." };
    }
    throw error;
  }

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "member.updated",
    entityType: "member",
    entityId: memberId,
  });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "member.updated",
    entityType: "member",
    entityId: memberId,
    before: { fullName: before.fullName, email: before.email, role: before.role, status: before.status },
    after: { fullName: data.fullName, email: data.email, role: data.role, status: data.status },
  });

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  return { success: true, memberId };
}

export async function addMemberNoteAction(memberId: string, body: string): Promise<MemberActionResult> {
  const trimmedBody = body.trim();
  if (!trimmedBody) return { success: false, error: "Note can't be empty." };

  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    return { success: false, error: "You don't have permission to add notes." };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!member) return { success: false, error: "Member not found." };

  await prisma.memberNote.create({ data: { memberId, authorId: actor.id, body: trimmedBody } });

  revalidatePath(`/members/${memberId}`);
  return { success: true, memberId };
}

export async function deleteMemberAction(memberId: string): Promise<MemberActionResult> {
  const actor = await requireCurrentMember();

  const target = await prisma.member.findFirst({
    where: { id: memberId, organizationId: actor.organizationId, deletedAt: null },
  });
  if (!target) return { success: false, error: "Member not found." };

  const deletePermission = canDeleteMember(actor, target);
  if (!deletePermission.allowed) {
    return { success: false, error: deletePermission.reason! };
  }

  if (target.systemRole === "SUPER_ADMIN" && (await isLastSuperAdmin(actor.organizationId, memberId))) {
    return { success: false, error: "Can't delete the last Super Admin." };
  }

  // "Prevent Orphaned Agencies" — deleting the last Owner of an agency
  // (canonical or team member) is blocked exactly like leaving/removing.
  const agencyContext = resolveMemberAgencyContext(target);
  if (agencyContext) {
    const ownershipGuard = await assertOwnershipSafe(actor.organizationId, agencyContext, memberId);
    if (!ownershipGuard.success) return ownershipGuard;
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "member.deleted",
    entityType: "member",
    entityId: memberId,
    before: { status: target.status, deletedAt: null },
    after: { status: "INACTIVE", deletedAt: true },
  });

  revalidatePath("/members");
  return { success: true, memberId };
}

export async function uploadMemberPhoto(memberId: string, formData: FormData): Promise<UploadPhotoResult> {
  const actor = await requireCurrentMember();

  const target = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!target) return { success: false, error: "Member not found." };

  const isSelf = actor.id === target.id;
  // "Manager: ... Edit agency profile" — an Owner/Manager may also update
  // their own agency's canonical logo, not just their own personal photo.
  const isAgencyProfileEdit = !isSelf && target.role === "AGENCY" && isAgencyAdmin(actor, target.id);
  if (!isSelf && !isAgencyProfileEdit) {
    if (!hasPermission(actor.systemRole, "members.manage")) {
      return { success: false, error: "You don't have permission to change this member's photo." };
    }
    if (!canEditMemberProfile(actor.systemRole, target.systemRole)) {
      return { success: false, error: "Only Super Admins can edit a Super Admin's profile." };
    }
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file was uploaded." };
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return { success: false, error: "Photos must be WebP, JPEG, or PNG." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { success: false, error: "Photo is too large." };
  }

  let photoUrl: string;
  try {
    const path = `${actor.organizationId}/${memberId}/${crypto.randomUUID()}.webp`;
    photoUrl = await uploadAvatarFile(path, file);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Upload failed. Please try again." };
  }

  await prisma.member.update({ where: { id: memberId }, data: { profilePhotoUrl: photoUrl } });

  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  return { success: true, photoUrl };
}
