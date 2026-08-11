"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { createNotification } from "@/lib/notifications";
import type { ReactionEmoji, ReactionTargetType } from "@prisma/client";

export type ReactionActionResult = { success: true; added: boolean } | { success: false; error: string };

/**
 * Add if absent, remove if present — the "toggle" semantics the spec asks
 * for ("Add reaction" / "Remove reaction"). A member can hold several
 * *different* emoji on the same target (Slack-style); toggling the same
 * emoji again removes just that one.
 */
export async function toggleReaction(
  targetType: ReactionTargetType,
  targetId: string,
  emoji: ReactionEmoji,
  revalidate?: string
): Promise<ReactionActionResult> {
  const actor = await requireCurrentMember();

  const existing = await prisma.reaction.findUnique({
    where: { targetType_targetId_memberId_emoji: { targetType, targetId, memberId: actor.id, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    if (revalidate) revalidatePath(revalidate);
    return { success: true, added: false };
  }

  await prisma.reaction.create({
    data: { organizationId: actor.organizationId, targetType, targetId, memberId: actor.id, emoji },
  });

  if (targetType === "POST") {
    const post = await prisma.communityPost.findUnique({
      where: { id: targetId },
      select: { authorId: true, organizationId: true },
    });
    if (post && post.authorId !== actor.id && post.organizationId === actor.organizationId) {
      await createNotification(post.authorId, {
        type: "COMMUNITY_REACTION",
        title: `${actor.fullName} reacted to your post`,
        link: "/community",
      });
    }
  }

  if (revalidate) revalidatePath(revalidate);
  return { success: true, added: true };
}

/** "Show who reacted" — all reactors for a target, optionally filtered to one emoji. */
export async function listReactors(targetType: ReactionTargetType, targetId: string, emoji?: ReactionEmoji) {
  const actor = await requireCurrentMember();

  return prisma.reaction.findMany({
    where: { targetType, targetId, emoji, organizationId: actor.organizationId },
    include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/** Grouped counts + "did I react" per emoji, for rendering the reaction bar. */
export async function getReactionSummary(targetType: ReactionTargetType, targetId: string) {
  const actor = await requireCurrentMember();

  const reactions = await prisma.reaction.findMany({
    where: { targetType, targetId, organizationId: actor.organizationId },
    select: { emoji: true, memberId: true },
  });

  const byEmoji = new Map<ReactionEmoji, { count: number; reactedByMe: boolean }>();
  for (const r of reactions) {
    const entry = byEmoji.get(r.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (r.memberId === actor.id) entry.reactedByMe = true;
    byEmoji.set(r.emoji, entry);
  }

  return Array.from(byEmoji.entries()).map(([emoji, v]) => ({ emoji, ...v }));
}
