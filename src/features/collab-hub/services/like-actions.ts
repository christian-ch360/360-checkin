"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { createNotification } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";

export type LikeActionResult = { success: true; liked: boolean } | { success: false; error: string };

/** Toggles a like on a Collab Hub post — likes if not yet liked, unlikes otherwise. */
export async function toggleCollabPostLike(postId: string): Promise<LikeActionResult> {
  const actor = await requireCurrentMember();

  const post = await prisma.collabPost.findFirst({
    where: { id: postId, organizationId: actor.organizationId },
    select: { id: true, title: true, memberId: true },
  });
  if (!post) return { success: false, error: "Collaboration post not found." };

  const existing = await prisma.collabPostLike.findUnique({
    where: { collabPostId_memberId: { collabPostId: postId, memberId: actor.id } },
  });

  if (existing) {
    await prisma.collabPostLike.delete({ where: { id: existing.id } });
    revalidatePath(`/collab-hub/${postId}`);
    revalidatePath("/collab-hub");
    return { success: true, liked: false };
  }

  await prisma.collabPostLike.create({ data: { collabPostId: postId, memberId: actor.id } });

  if (post.memberId !== actor.id) {
    const owner = await prisma.member.findUnique({
      where: { id: post.memberId },
      select: { id: true, email: true, fullName: true, notifyLikes: true, organizationId: true },
    });
    if (owner) {
      await createNotification(owner.id, {
        type: "LIKE",
        title: `${actor.fullName} liked your post`,
        body: post.title,
        link: `/collab-hub/${postId}`,
      });
      if (owner.notifyLikes) {
        await EmailService.sendNewLikeEmail({
          to: owner.email,
          fullName: owner.fullName,
          likerName: actor.fullName,
          postTitle: post.title,
          postUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/collab-hub/${postId}`,
          organizationId: owner.organizationId,
          memberId: owner.id,
        });
      }
    }
  }

  revalidatePath(`/collab-hub/${postId}`);
  revalidatePath("/collab-hub");
  return { success: true, liked: true };
}
