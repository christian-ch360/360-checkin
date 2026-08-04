"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { createNotification } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";

export type CommentActionResult = { success: true } | { success: false; error: string };

const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty").max(1000, "Comment is too long"),
});

const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;

function extractMentionedUsernames(body: string): string[] {
  const usernames = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    usernames.add(match[1]);
  }
  return [...usernames];
}

/** Adds a comment to a Collab Hub post, notifying the post owner and any @mentioned members. */
export async function addCollabPostComment(postId: string, input: { body: string }): Promise<CommentActionResult> {
  const actor = await requireCurrentMember();

  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const post = await prisma.collabPost.findFirst({
    where: { id: postId, organizationId: actor.organizationId },
    select: { id: true, title: true, memberId: true },
  });
  if (!post) return { success: false, error: "Collaboration post not found." };

  const mentionedUsernames = extractMentionedUsernames(parsed.data.body);
  const mentionedMembers = mentionedUsernames.length
    ? await prisma.member.findMany({
        where: { organizationId: actor.organizationId, username: { in: mentionedUsernames } },
        select: { id: true, email: true, fullName: true, notifyMentions: true, organizationId: true },
      })
    : [];

  await prisma.comment.create({
    data: {
      collabPostId: postId,
      memberId: actor.id,
      body: parsed.data.body,
      mentions: mentionedMembers.map((m) => m.id),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const postUrl = `${appUrl}/collab-hub/${postId}`;
  const preview = parsed.data.body.length > 140 ? `${parsed.data.body.slice(0, 140)}…` : parsed.data.body;

  if (post.memberId !== actor.id) {
    const owner = await prisma.member.findUnique({
      where: { id: post.memberId },
      select: { id: true, email: true, fullName: true, notifyComments: true, organizationId: true },
    });
    if (owner) {
      await createNotification(owner.id, {
        type: "COMMENT",
        title: `${actor.fullName} commented on your post`,
        body: preview,
        link: `/collab-hub/${postId}`,
      });
      if (owner.notifyComments) {
        await EmailService.sendNewCommentEmail({
          to: owner.email,
          fullName: owner.fullName,
          commenterName: actor.fullName,
          postTitle: post.title,
          commentBody: preview,
          postUrl,
          organizationId: owner.organizationId,
          memberId: owner.id,
        });
      }
    }
  }

  for (const mentioned of mentionedMembers) {
    if (mentioned.id === actor.id || mentioned.id === post.memberId) continue;
    await createNotification(mentioned.id, {
      type: "MENTION",
      title: `${actor.fullName} mentioned you`,
      body: preview,
      link: `/collab-hub/${postId}`,
    });
    if (mentioned.notifyMentions) {
      await EmailService.sendMentionEmail({
        to: mentioned.email,
        fullName: mentioned.fullName,
        mentionerName: actor.fullName,
        postTitle: post.title,
        commentBody: preview,
        postUrl,
        organizationId: mentioned.organizationId,
        memberId: mentioned.id,
      });
    }
  }

  revalidatePath(`/collab-hub/${postId}`);
  return { success: true };
}
