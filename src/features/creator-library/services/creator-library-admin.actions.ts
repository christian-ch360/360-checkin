"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { uploadCreatorLibraryImage } from "@/lib/supabase/storage";
import { normalizeLocation } from "@/features/creator-library/lib/location";
import {
  bulkAssignCategoriesSchema,
  bulkAssignLocationSchema,
  bulkFeaturedSchema,
  bulkVisibilitySchema,
  libraryProfileSchema,
  type LibraryProfileInput,
} from "@/features/creator-library/schemas/library-profile.schema";

export type LibraryAdminResult = { success: true } | { success: false; error: string };
export type LibraryCreateResult = { success: true; profileId: string } | { success: false; error: string };
export type LibraryImageResult = { success: true; imageUrl: string } | { success: false; error: string };

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function requireLibraryManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    throw new Error("You don't have permission to manage the Creator Library.");
  }
  return actor;
}

function revalidateLibrary(profileId?: string) {
  revalidatePath("/creator-library");
  if (profileId) revalidatePath(`/creator-library/${profileId}`);
  revalidatePath("/admin/creator-library");
  if (profileId) revalidatePath(`/admin/creator-library/${profileId}`);
}

async function loadProfile(organizationId: string, profileId: string) {
  const profile = await prisma.creatorLibraryProfile.findFirst({
    where: { id: profileId, organizationId },
    select: { id: true, visible: true, featured: true, publishedAt: true, memberId: true },
  });
  if (!profile) throw new Error("That library profile no longer exists.");
  return profile;
}

/** Create a draft profile from an existing Member so Ops can edit it. */
export async function createLibraryProfileForMember(memberId: string): Promise<LibraryCreateResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: actor.organizationId, role: "CREATOR", status: "ACTIVE", deletedAt: null },
    select: { id: true, creatorLibraryProfile: { select: { id: true } } },
  });
  if (!member) return { success: false, error: "That creator isn't available for the library." };
  if (member.creatorLibraryProfile) return { success: true, profileId: member.creatorLibraryProfile.id };

  const profile = await prisma.creatorLibraryProfile.create({
    data: { organizationId: actor.organizationId, memberId, addedById: actor.id, visible: false },
    select: { id: true },
  });
  revalidateLibrary();
  return { success: true, profileId: profile.id };
}

/** Create a blank standalone draft profile (no linked Member) for Ops to fill in. */
export async function createBlankLibraryProfile(name: string): Promise<LibraryCreateResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) return { success: false, error: "Enter the creator's name." };

  const profile = await prisma.creatorLibraryProfile.create({
    data: { organizationId: actor.organizationId, addedById: actor.id, visible: false, name: trimmed },
    select: { id: true },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "creator_library.profile_created",
    entityType: "CreatorLibraryProfile",
    entityId: profile.id,
    after: { name: trimmed, standalone: true },
  });

  revalidateLibrary();
  return { success: true, profileId: profile.id };
}

/** Full edit of a library profile. */
export async function saveCreatorLibraryProfile(
  profileId: string,
  input: LibraryProfileInput,
): Promise<LibraryAdminResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }

  const parsed = libraryProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Some fields need attention." };
  }

  let existing;
  try {
    existing = await loadProfile(actor.organizationId, profileId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Profile not found." };
  }

  const data = parsed.data;
  const location = normalizeLocation({ country: data.country, state: data.state, city: data.city });
  const publishedAt = data.visible && !existing.publishedAt ? new Date() : (existing.publishedAt ?? null);

  await prisma.creatorLibraryProfile.update({
    where: { id: profileId },
    data: {
      visible: data.visible,
      featured: data.visible ? data.featured : false,
      displayOrder: data.displayOrder,
      headline: data.headline,
      libraryBio: data.libraryBio,
      categories: data.categories,
      imageUrl: data.imageUrl,
      name: existing.memberId ? null : data.name,
      email: existing.memberId ? null : data.email,
      phone: existing.memberId ? null : data.phone,
      usernameHandle: existing.memberId ? null : data.usernameHandle,
      companyName: existing.memberId ? null : data.companyName,
      instagramUrl: data.instagramUrl,
      tiktokUrl: data.tiktokUrl,
      youtubeUrl: data.youtubeUrl,
      websiteUrl: data.websiteUrl,
      country: location.country,
      state: location.state,
      city: location.city,
      instagramFollowers: data.instagramFollowers,
      tiktokFollowers: data.tiktokFollowers,
      youtubeSubscribers: data.youtubeSubscribers,
      publishedAt,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "creator_library.profile_saved",
    entityType: "CreatorLibraryProfile",
    entityId: profileId,
    after: { visible: data.visible, featured: data.featured },
  });

  revalidateLibrary(profileId);
  return { success: true };
}

export async function setCreatorLibraryVisibility(profileId: string, visible: boolean): Promise<LibraryAdminResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }
  let existing;
  try {
    existing = await loadProfile(actor.organizationId, profileId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Profile not found." };
  }

  await prisma.creatorLibraryProfile.update({
    where: { id: profileId },
    data: {
      visible,
      publishedAt: visible && !existing.publishedAt ? new Date() : existing.publishedAt,
      ...(visible ? {} : { featured: false }),
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: visible ? "creator_library.published" : "creator_library.unpublished",
    entityType: "CreatorLibraryProfile",
    entityId: profileId,
  });

  revalidateLibrary(profileId);
  return { success: true };
}

export async function setCreatorLibraryFeatured(profileId: string, featured: boolean): Promise<LibraryAdminResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }
  let existing;
  try {
    existing = await loadProfile(actor.organizationId, profileId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Profile not found." };
  }
  if (featured && !existing.visible) {
    return { success: false, error: "Publish this creator before featuring them." };
  }

  await prisma.creatorLibraryProfile.update({ where: { id: profileId }, data: { featured } });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: featured ? "creator_library.featured" : "creator_library.unfeatured",
    entityType: "CreatorLibraryProfile",
    entityId: profileId,
  });
  revalidateLibrary(profileId);
  return { success: true };
}

export async function uploadCreatorLibraryPortrait(profileId: string, formData: FormData): Promise<LibraryImageResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
    await loadProfile(actor.organizationId, profileId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Profile not found." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file was uploaded." };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { success: false, error: "Images must be JPEG, PNG, or WebP." };
  if (file.size > MAX_IMAGE_BYTES) return { success: false, error: "Image is larger than 8MB." };

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${actor.organizationId}/${profileId}/${crypto.randomUUID()}.${extension}`;
  try {
    const imageUrl = await uploadCreatorLibraryImage(path, file);
    return { success: true, imageUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Upload failed. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// Bulk organization (spec §12)
// ---------------------------------------------------------------------------

async function scopeProfileIds(organizationId: string, profileIds: string[]): Promise<string[]> {
  const rows = await prisma.creatorLibraryProfile.findMany({
    where: { id: { in: profileIds }, organizationId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function bulkAssignCategories(input: unknown): Promise<LibraryAdminResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }
  const parsed = bulkAssignCategoriesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick at least one category." };
  const ids = await scopeProfileIds(actor.organizationId, parsed.data.profileIds);

  await prisma.$transaction(async (tx) => {
    if (parsed.data.mode === "replace") {
      await tx.creatorLibraryProfile.updateMany({ where: { id: { in: ids } }, data: { categories: parsed.data.categories } });
    } else {
      const profiles = await tx.creatorLibraryProfile.findMany({ where: { id: { in: ids } }, select: { id: true, categories: true } });
      for (const p of profiles) {
        const merged = [...new Set([...p.categories, ...parsed.data.categories])];
        await tx.creatorLibraryProfile.update({ where: { id: p.id }, data: { categories: merged } });
      }
    }
  });

  await logAudit({ organizationId: actor.organizationId, actorId: actor.id, action: "creator_library.bulk_categories", entityType: "CreatorLibraryProfile", entityId: ids[0] ?? actor.id, after: { profileCount: ids.length } });
  revalidateLibrary();
  return { success: true };
}

export async function bulkAssignLocation(input: unknown): Promise<LibraryAdminResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }
  const parsed = bulkAssignLocationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid location." };
  const ids = await scopeProfileIds(actor.organizationId, parsed.data.profileIds);
  const location = normalizeLocation({ country: parsed.data.country, state: parsed.data.state, city: parsed.data.city });

  await prisma.creatorLibraryProfile.updateMany({
    where: { id: { in: ids } },
    data: { country: location.country, state: location.state, city: location.city },
  });

  await logAudit({ organizationId: actor.organizationId, actorId: actor.id, action: "creator_library.bulk_location", entityType: "CreatorLibraryProfile", entityId: ids[0] ?? actor.id, after: { profileCount: ids.length } });
  revalidateLibrary();
  return { success: true };
}

export async function bulkSetVisibility(input: unknown): Promise<LibraryAdminResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }
  const parsed = bulkVisibilitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid selection." };
  const ids = await scopeProfileIds(actor.organizationId, parsed.data.profileIds);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (parsed.data.visible) {
      await tx.creatorLibraryProfile.updateMany({ where: { id: { in: ids }, publishedAt: null }, data: { publishedAt: now } });
      await tx.creatorLibraryProfile.updateMany({ where: { id: { in: ids } }, data: { visible: true } });
    } else {
      await tx.creatorLibraryProfile.updateMany({ where: { id: { in: ids } }, data: { visible: false, featured: false } });
    }
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: parsed.data.visible ? "creator_library.bulk_published" : "creator_library.bulk_unpublished",
    entityType: "CreatorLibraryProfile",
    entityId: ids[0] ?? actor.id,
    after: { profileCount: ids.length },
  });
  revalidateLibrary();
  return { success: true };
}

export async function bulkSetFeatured(input: unknown): Promise<LibraryAdminResult> {
  let actor;
  try {
    actor = await requireLibraryManager();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }
  const parsed = bulkFeaturedSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid selection." };
  const ids = await scopeProfileIds(actor.organizationId, parsed.data.profileIds);

  if (parsed.data.featured) {
    const visibleProfiles = await prisma.creatorLibraryProfile.findMany({
      where: { id: { in: ids }, visible: true },
      select: { id: true },
    });
    const maxOrder = await prisma.creatorLibraryProfile.aggregate({
      where: { organizationId: actor.organizationId, featured: true },
      _max: { displayOrder: true },
    });
    let next = (maxOrder._max.displayOrder ?? 0) + 1;
    await prisma.$transaction(
      visibleProfiles.map((p) =>
        prisma.creatorLibraryProfile.update({ where: { id: p.id }, data: { featured: true, displayOrder: next++ } }),
      ),
    );
    if (visibleProfiles.length < ids.length) {
      revalidateLibrary();
      return { success: false, error: `Featured ${visibleProfiles.length}. ${ids.length - visibleProfiles.length} weren't published yet.` };
    }
  } else {
    await prisma.creatorLibraryProfile.updateMany({ where: { id: { in: ids } }, data: { featured: false } });
  }

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: parsed.data.featured ? "creator_library.bulk_featured" : "creator_library.bulk_unfeatured",
    entityType: "CreatorLibraryProfile",
    entityId: ids[0] ?? actor.id,
    after: { profileCount: ids.length },
  });
  revalidateLibrary();
  return { success: true };
}
