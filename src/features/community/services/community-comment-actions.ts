"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { createNotification, notifyMembers } from "@/lib/notifications";
import { extractMentionedUsernames } from "@/lib/mentions";

export type CommunityCommentActionResult = { success: true; commentId?: string } | { success: false; error: string };

const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty").max(1000, "Comment is too long"),
  parentId: z.string().uuid().nullable().optional(),
});

export async function addCommunityComment(
  postId: string,
  input: { body: string; parentId?: string | null }
): Promise<CommunityCommentActionResult> {
  const actor = await requireCurrentMember();

  if (actor.communityPostingSuspendedAt) {
    return {
      success: false,
      error: actor.communityPostingSuspendedReason
        ? `You're suspended from posting: ${actor.communityPostingSuspendedReason}`
        : "You're currently suspended from posting.",
    };
  }

  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const post = await prisma.communityPost.findFirst({
    where: { id: postId, organizationId: actor.organizationId },
    select: { id: true, authorId: true, isLocked: true, deletedAt: true },
  });
  if (!post || post.deletedAt) return { success: false, error: "Post not found." };
  if (post.isLocked) return { success: false, error: "Comments are locked on this post." };

  let parentComment: { id: string; authorId: string } | null = null;
  if (parsed.data.parentId) {
    parentComment = await prisma.communityComment.findFirst({
      where: { id: parsed.data.parentId, postId },
      select: { id: true, authorId: true },
    });
    if (!parentComment) return { success: false, error: "The comment you're replying to no longer exists." };
  }

  const comment = await prisma.communityComment.create({
    data: { postId, authorId: actor.id, parentId: parsed.data.parentId ?? null, body: parsed.data.body },
  });

  const preview = parsed.data.body.length > 140 ? `${parsed.data.body.slice(0, 140)}…` : parsed.data.body;

  if (parentComment && parentComment.authorId !== actor.id) {
    await createNotification(parentComment.authorId, {
      type: "COMMUNITY_REPLY",
      title: `${actor.fullName} replied to your comment`,
      body: preview,
      link: "/community",
    });
  } else if (!parentComment && post.authorId !== actor.id) {
    await createNotification(post.authorId, {
      type: "COMMENT",
      title: `${actor.fullName} commented on your post`,
      body: preview,
      link: "/community",
    });
  }

  const mentionedUsernames = extractMentionedUsernames(parsed.data.body);
  if (mentionedUsernames.length > 0) {
    const mentioned = await prisma.member.findMany({
      where: { organizationId: actor.organizationId, username: { in: mentionedUsernames }, id: { not: actor.id } },
      select: { id: true, notifyMentions: true },
    });
    await notifyMembers(
      mentioned.filter((m) => m.notifyMentions).map((m) => m.id),
      { type: "MENTION", title: `${actor.fullName} mentioned you in Community`, body: preview, link: "/community" }
    );
  }

  revalidatePath("/community");
  return { success: true, commentId: comment.id };
}

export async function editCommunityComment(commentId: string, body: string): Promise<CommunityCommentActionResult> {
  const actor = await requireCurrentMember();

  const parsed = commentSchema.pick({ body: true }).safeParse({ body });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const comment = await prisma.communityComment.findFirst({
    where: { id: commentId, post: { organizationId: actor.organizationId } },
  });
  if (!comment || comment.deletedAt) return { success: false, error: "Comment not found." };
  if (comment.authorId !== actor.id) return { success: false, error: "You can only edit your own comments." };

  await prisma.communityComment.update({
    where: { id: commentId },
    data: { body: parsed.data.body, editedAt: new Date() },
  });

  revalidatePath("/community");
  return { success: true };
}

export async function deleteCommunityComment(commentId: string): Promise<CommunityCommentActionResult> {
  const actor = await requireCurrentMember();

  const comment = await prisma.communityComment.findFirst({
    where: { id: commentId, post: { organizationId: actor.organizationId } },
  });
  if (!comment) return { success: false, error: "Comment not found." };

  const isOwner = comment.authorId === actor.id;
  const canModerate = hasPermission(actor.systemRole, "community.moderate");
  if (!isOwner && !canModerate) return { success: false, error: "You don't have permission to delete this comment." };

  // Soft delete — a "[deleted]" placeholder renders in its place so replies
  // underneath aren't orphaned.
  await prisma.communityComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });

  revalidatePath("/community");
  return { success: true };
}
