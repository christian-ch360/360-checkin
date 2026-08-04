"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { createNotification } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";

export type FollowActionResult = { success: true; following: boolean } | { success: false; error: string };

/** Toggles a follow relationship — follows if not yet following, unfollows otherwise. */
export async function toggleFollowMember(memberId: string): Promise<FollowActionResult> {
  const actor = await requireCurrentMember();
  if (memberId === actor.id) return { success: false, error: "You can't follow yourself." };

  const target = await prisma.member.findFirst({
    where: { id: memberId, organizationId: actor.organizationId },
    select: { id: true, email: true, fullName: true, notifyFollows: true, organizationId: true },
  });
  if (!target) return { success: false, error: "Member not found." };

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: actor.id, followingId: memberId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    revalidatePath(`/profile`);
    return { success: true, following: false };
  }

  await prisma.follow.create({ data: { followerId: actor.id, followingId: memberId } });

  await createNotification(target.id, {
    type: "NEW_FOLLOWER",
    title: `${actor.fullName} started following you`,
    link: `/profile`,
  });
  if (target.notifyFollows) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await EmailService.sendNewFollowerEmail({
      to: target.email,
      fullName: target.fullName,
      followerName: actor.fullName,
      followerProfileUrl: `${appUrl}/profile`,
      organizationId: target.organizationId,
      memberId: target.id,
    });
  }

  revalidatePath(`/profile`);
  return { success: true, following: true };
}
