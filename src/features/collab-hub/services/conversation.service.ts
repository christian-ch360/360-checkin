import "server-only";

import { prisma } from "@/lib/db/prisma";

const MESSAGE_INCLUDE = {
  sender: { select: { id: true, fullName: true, profilePhotoUrl: true } },
  projectRef: { select: { id: true, name: true, status: true } },
  reservationRef: {
    select: { id: true, startTime: true, endTime: true, space: { select: { name: true } } },
  },
} as const;

/**
 * Minimum-cost unread count: no post/profile/message-body data, just the
 * latest message's sender + timestamp per conversation (via LATERAL join,
 * using the existing @@index([conversationId, createdAt]) on collab_messages)
 * compared against the member's own last-read marker.
 */
export async function getUnreadCollabMessageCount(memberId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM collab_conversations c
    JOIN LATERAL (
      SELECT m."senderId", m."createdAt"
      FROM collab_messages m
      WHERE m."conversationId" = c."id"
      ORDER BY m."createdAt" DESC
      LIMIT 1
    ) lm ON true
    WHERE (c."posterId" = ${memberId}::uuid OR c."initiatorId" = ${memberId}::uuid)
      AND lm."senderId" != ${memberId}::uuid
      AND (
        (c."posterId" = ${memberId}::uuid AND (c."posterLastReadAt" IS NULL OR lm."createdAt" > c."posterLastReadAt"))
        OR
        (c."initiatorId" = ${memberId}::uuid AND (c."initiatorLastReadAt" IS NULL OR lm."createdAt" > c."initiatorLastReadAt"))
      )
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function listConversationsForMember(memberId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ posterId: memberId }, { initiatorId: memberId }] },
    orderBy: { updatedAt: "desc" },
    include: {
      collabPost: { select: { id: true, title: true } },
      poster: { select: { id: true, fullName: true, profilePhotoUrl: true } },
      initiator: { select: { id: true, fullName: true, profilePhotoUrl: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return conversations.map((c) => {
    const isPoster = c.posterId === memberId;
    const other = isPoster ? c.initiator : c.poster;
    const myLastReadAt = isPoster ? c.posterLastReadAt : c.initiatorLastReadAt;
    const lastMessage = c.messages[0] ?? null;
    const unread = Boolean(
      lastMessage &&
        lastMessage.senderId !== memberId &&
        (!myLastReadAt || lastMessage.createdAt > myLastReadAt)
    );

    return {
      id: c.id,
      postId: c.collabPost.id,
      postTitle: c.collabPost.title,
      other,
      lastMessage,
      unread,
      updatedAt: c.updatedAt,
    };
  });
}

export async function getConversationWithMessages(conversationId: string, actorId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      collabPost: { select: { id: true, title: true } },
      poster: { select: { id: true, fullName: true, profilePhotoUrl: true } },
      initiator: { select: { id: true, fullName: true, profilePhotoUrl: true } },
      messages: { orderBy: { createdAt: "asc" }, include: MESSAGE_INCLUDE },
    },
  });

  if (!conversation) return null;
  if (conversation.posterId !== actorId && conversation.initiatorId !== actorId) return null;

  return conversation;
}

export async function getConversationPollData(
  conversationId: string,
  actorId: string,
  afterMessageId?: string
) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (conversation.posterId !== actorId && conversation.initiatorId !== actorId) return null;

  const isPoster = conversation.posterId === actorId;

  let afterCreatedAt: Date | undefined;
  if (afterMessageId) {
    const afterMessage = await prisma.message.findUnique({
      where: { id: afterMessageId },
      select: { createdAt: true },
    });
    afterCreatedAt = afterMessage?.createdAt;
  }

  const newMessages = await prisma.message.findMany({
    where: { conversationId, ...(afterCreatedAt ? { createdAt: { gt: afterCreatedAt } } : {}) },
    orderBy: { createdAt: "asc" },
    include: MESSAGE_INCLUDE,
  });

  const otherTypingAt = isPoster ? conversation.initiatorTypingAt : conversation.posterTypingAt;
  const otherLastReadAt = isPoster ? conversation.initiatorLastReadAt : conversation.posterLastReadAt;
  const otherTyping = Boolean(otherTypingAt && Date.now() - otherTypingAt.getTime() < 5000);

  return { newMessages, otherTyping, otherLastReadAt };
}
