"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/db/activity-log";
import { notifyMembers } from "@/lib/notifications";
import { extractHashtags, extractMentionedUsernames } from "@/lib/mentions";
import { uploadCommunityAttachment } from "@/lib/supabase/storage";
import type { CommunityAttachmentType, CommunityPostType } from "@prisma/client";

export type CommunityPostActionResult = { success: true; postId?: string } | { success: false; error: string };

const postSchema = z.object({
  type: z.enum(["UPDATE", "QUESTION", "OPPORTUNITY", "WIN", "COLLABORATION", "ANNOUNCEMENT"]),
  body: z.string().trim().min(1, "Post can't be empty").max(5000, "Post is too long"),
});

function attachmentTypeFor(mimeType: string): CommunityAttachmentType {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType === "application/pdf") return "PDF";
  return "DOCUMENT";
}

async function uploadAttachmentsFor(postId: string, organizationId: string, files: File[]) {
  if (files.length === 0) return;
  const rows = [];
  for (const file of files) {
    const path = `${organizationId}/${postId}/${crypto.randomUUID()}-${file.name}`;
    const url = await uploadCommunityAttachment(path, file);
    rows.push({
      postId,
      type: attachmentTypeFor(file.type),
      url,
      fileName: file.name,
      mimeType: file.type || null,
      sizeBytes: file.size,
    });
  }
  await prisma.communityAttachment.createMany({ data: rows });
}

/** Re-derives hashtag/mention join rows from a post's current body, notifying newly-mentioned members. */
async function syncHashtagsAndMentions(
  postId: string,
  organizationId: string,
  authorId: string,
  authorName: string,
  body: string
) {
  const tags = extractHashtags(body);
  const usernames = extractMentionedUsernames(body);

  await prisma.$transaction([
    prisma.communityPostHashtag.deleteMany({ where: { postId } }),
    prisma.communityPostMention.deleteMany({ where: { postId } }),
  ]);

  if (tags.length > 0) {
    for (const tag of tags) {
      const hashtag = await prisma.hashtag.upsert({
        where: { organizationId_tag: { organizationId, tag } },
        update: {},
        create: { organizationId, tag },
      });
      await prisma.communityPostHashtag.create({ data: { postId, hashtagId: hashtag.id } }).catch(() => {});
    }
  }

  if (usernames.length > 0) {
    const mentioned = await prisma.member.findMany({
      where: { organizationId, username: { in: usernames }, id: { not: authorId } },
      select: { id: true, notifyMentions: true },
    });
    if (mentioned.length > 0) {
      await prisma.communityPostMention.createMany({
        data: mentioned.map((m) => ({ postId, memberId: m.id })),
        skipDuplicates: true,
      });
      await notifyMembers(
        mentioned.filter((m) => m.notifyMentions).map((m) => m.id),
        { type: "MENTION", title: `${authorName} mentioned you in Community`, link: "/community" }
      );
    }
  }
}

export async function createCommunityPost(formData: FormData): Promise<CommunityPostActionResult> {
  const actor = await requireCurrentMember();

  if (actor.communityPostingSuspendedAt) {
    return {
      success: false,
      error: actor.communityPostingSuspendedReason
        ? `You're suspended from posting: ${actor.communityPostingSuspendedReason}`
        : "You're currently suspended from posting.",
    };
  }

  const parsed = postSchema.safeParse({ type: formData.get("type"), body: formData.get("body") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  const post = await prisma.communityPost.create({
    data: {
      organizationId: actor.organizationId,
      authorId: actor.id,
      type: parsed.data.type as CommunityPostType,
      body: parsed.data.body,
    },
  });

  await uploadAttachmentsFor(post.id, actor.organizationId, files);
  await syncHashtagsAndMentions(post.id, actor.organizationId, actor.id, actor.fullName, parsed.data.body);

  if (parsed.data.type === "ANNOUNCEMENT") {
    const recipients = await prisma.member.findMany({
      where: { organizationId: actor.organizationId, status: "ACTIVE", id: { not: actor.id } },
      select: { id: true },
    });
    await notifyMembers(
      recipients.map((m) => m.id),
      { type: "COMMUNITY_ANNOUNCEMENT_POSTED", title: `New announcement from ${actor.fullName}`, link: "/community" }
    );
  }

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "community_post.created",
    entityType: "community_post",
    entityId: post.id,
    metadata: { type: post.type },
  });

  revalidatePath("/community");
  return { success: true, postId: post.id };
}

export async function updateCommunityPost(postId: string, formData: FormData): Promise<CommunityPostActionResult> {
  const actor = await requireCurrentMember();

  const post = await prisma.communityPost.findFirst({ where: { id: postId, organizationId: actor.organizationId } });
  if (!post || post.deletedAt) return { success: false, error: "Post not found." };
  if (post.authorId !== actor.id) return { success: false, error: "You can only edit your own posts." };

  const parsed = postSchema.safeParse({ type: formData.get("type"), body: formData.get("body") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.communityPost.update({
    where: { id: postId },
    data: { type: parsed.data.type as CommunityPostType, body: parsed.data.body, editedAt: new Date() },
  });

  await syncHashtagsAndMentions(postId, actor.organizationId, actor.id, actor.fullName, parsed.data.body);

  revalidatePath("/community");
  return { success: true, postId };
}

export async function deleteCommunityPost(postId: string): Promise<CommunityPostActionResult> {
  const actor = await requireCurrentMember();

  const post = await prisma.communityPost.findFirst({ where: { id: postId, organizationId: actor.organizationId } });
  if (!post) return { success: false, error: "Post not found." };

  const isOwner = post.authorId === actor.id;
  const canModerate = hasPermission(actor.systemRole, "community.moderate");
  if (!isOwner && !canModerate) return { success: false, error: "You don't have permission to delete this post." };

  await prisma.communityPost.update({ where: { id: postId }, data: { deletedAt: new Date() } });

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "community_post.deleted",
    entityType: "community_post",
    entityId: postId,
  });

  revalidatePath("/community");
  return { success: true };
}

async function setPinned(postId: string, isPinned: boolean): Promise<CommunityPostActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "community.moderate")) {
    return { success: false, error: "You don't have permission to pin posts." };
  }

  const post = await prisma.communityPost.findFirst({ where: { id: postId, organizationId: actor.organizationId } });
  if (!post) return { success: false, error: "Post not found." };

  await prisma.communityPost.update({ where: { id: postId }, data: { isPinned } });
  revalidatePath("/community");
  return { success: true };
}

export async function pinCommunityPost(postId: string) {
  return setPinned(postId, true);
}
export async function unpinCommunityPost(postId: string) {
  return setPinned(postId, false);
}

async function setLocked(postId: string, isLocked: boolean): Promise<CommunityPostActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "community.moderate")) {
    return { success: false, error: "You don't have permission to lock posts." };
  }

  const post = await prisma.communityPost.findFirst({ where: { id: postId, organizationId: actor.organizationId } });
  if (!post) return { success: false, error: "Post not found." };

  await prisma.communityPost.update({ where: { id: postId }, data: { isLocked } });
  revalidatePath("/community");
  return { success: true };
}

export async function lockCommunityPost(postId: string) {
  return setLocked(postId, true);
}
export async function unlockCommunityPost(postId: string) {
  return setLocked(postId, false);
}

const reportSchema = z.object({ reason: z.string().trim().min(1, "Tell us why you're reporting this.").max(500) });

export async function reportCommunityPost(postId: string, reason: string): Promise<CommunityPostActionResult> {
  const actor = await requireCurrentMember();

  const parsed = reportSchema.safeParse({ reason });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const post = await prisma.communityPost.findFirst({ where: { id: postId, organizationId: actor.organizationId } });
  if (!post) return { success: false, error: "Post not found." };

  await prisma.communityPostReport.create({
    data: { postId, reporterId: actor.id, reason: parsed.data.reason },
  });

  const moderators = await prisma.member.findMany({
    where: { organizationId: actor.organizationId, systemRole: { in: ["ADMIN", "SUPER_ADMIN", "MANAGER"] } },
    select: { id: true },
  });
  await notifyMembers(
    moderators.map((m) => m.id),
    { type: "COMMUNITY_POST_REPORTED", title: `${actor.fullName} reported a post`, link: "/community" }
  );

  return { success: true };
}
