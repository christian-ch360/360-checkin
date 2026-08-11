import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  listConversationsForMember as listCollabConversationsForMember,
  getUnreadCollabMessageCount,
} from "@/features/collab-hub/services/conversation.service";
import type { ReactionEmoji } from "@prisma/client";

const MESSAGE_INCLUDE = {
  sender: { select: { id: true, fullName: true, profilePhotoUrl: true } },
} as const;

/**
 * Minimum-cost unread count: no participant/profile/message-body data, just
 * the latest message's sender + timestamp per conversation (via LATERAL
 * join, using the existing @@index([conversationId, createdAt]) on
 * direct_messages) compared against the member's own lastReadAt.
 */
export async function getUnreadDirectMessageCount(memberId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM direct_conversation_participants p
    JOIN LATERAL (
      SELECT m."senderId", m."createdAt"
      FROM direct_messages m
      WHERE m."conversationId" = p."conversationId"
      ORDER BY m."createdAt" DESC
      LIMIT 1
    ) lm ON true
    WHERE p."memberId" = ${memberId}::uuid
      AND lm."senderId" != ${memberId}::uuid
      AND (p."lastReadAt" IS NULL OR lm."createdAt" > p."lastReadAt")
  `;
  return Number(rows[0]?.count ?? 0);
}

/** Sums both messaging subsystems (direct DMs + Collab Hub threads) — the
 * same merge the full inbox list does, but without materializing either. */
export async function getUnreadMessageCount(memberId: string): Promise<number> {
  const [direct, collab] = await Promise.all([
    getUnreadDirectMessageCount(memberId),
    getUnreadCollabMessageCount(memberId),
  ]);
  return direct + collab;
}

export async function listDirectConversationsForMember(memberId: string) {
  const participantRows = await prisma.directConversationParticipant.findMany({
    where: { memberId },
    include: {
      conversation: {
        include: {
          participants: {
            where: { memberId: { not: memberId } },
            include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  return participantRows.map((p) => {
    const conversation = p.conversation;
    const other = conversation.participants[0]?.member ?? null;
    const lastMessage = conversation.messages[0] ?? null;
    const unread = Boolean(
      lastMessage && lastMessage.senderId !== memberId && (!p.lastReadAt || lastMessage.createdAt > p.lastReadAt)
    );
    const displayName = conversation.isGroup
      ? (conversation.name ?? conversation.participants.map((participant) => participant.member.fullName).join(", "))
      : (other?.fullName ?? "Unknown member");

    return {
      id: conversation.id,
      other,
      isGroup: conversation.isGroup,
      displayName,
      lastMessage,
      unread,
      updatedAt: conversation.updatedAt,
    };
  });
}

export type ConversationSummary = {
  kind: "dm" | "collab";
  id: string;
  routeId: string;
  other: { id: string; fullName: string; profilePhotoUrl: string | null } | null;
  isGroup: boolean;
  displayName: string;
  subtitle: string | null;
  lastMessagePreview: string | null;
  unread: boolean;
  updatedAt: Date;
};

function previewFor(message: { type: string; body: string | null } | null) {
  if (!message) return null;
  if (message.type === "TEXT") return message.body;
  if (message.type === "IMAGE") return "Sent an image";
  if (message.type === "FILE") return "Sent a file";
  if (message.type === "VOICE") return "Sent a voice message";
  return "Sent a message";
}

/**
 * Merges the new participant-based DM system with the existing Collab
 * Hub conversation system (unchanged, imported as-is) into one inbox list —
 * DMs and Collab Hub threads render side by side, sorted by recency, without
 * either backing system knowing about the other.
 */
export async function listAllConversationsForMember(memberId: string): Promise<ConversationSummary[]> {
  const [directConversations, collabConversations] = await Promise.all([
    listDirectConversationsForMember(memberId),
    listCollabConversationsForMember(memberId),
  ]);

  const dmSummaries: ConversationSummary[] = directConversations.map((c) => ({
    kind: "dm",
    id: c.id,
    routeId: `dm_${c.id}`,
    other: c.other,
    isGroup: c.isGroup,
    displayName: c.displayName,
    subtitle: null,
    lastMessagePreview: previewFor(c.lastMessage),
    unread: c.unread,
    updatedAt: c.updatedAt,
  }));

  const collabSummaries: ConversationSummary[] = collabConversations.map((c) => ({
    kind: "collab",
    id: c.id,
    routeId: `collab_${c.id}`,
    other: c.other,
    isGroup: false,
    displayName: c.other?.fullName ?? "Unknown member",
    subtitle: `via Collab Hub · ${c.postTitle}`,
    lastMessagePreview: previewFor(c.lastMessage),
    unread: c.unread,
    updatedAt: c.updatedAt,
  }));

  return [...dmSummaries, ...collabSummaries].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** Reaction summary (emoji -> count + reactedByMe) for a batch of messages, keyed by messageId. */
async function getReactionsByMessageId(messageIds: string[], actorId: string) {
  if (messageIds.length === 0) return {} as Record<string, { emoji: ReactionEmoji; count: number; reactedByMe: boolean }[]>;

  const reactions = await prisma.reaction.findMany({
    where: { targetType: "MESSAGE", targetId: { in: messageIds } },
    select: { targetId: true, emoji: true, memberId: true },
  });

  const byMessage: Record<string, Map<ReactionEmoji, { count: number; reactedByMe: boolean }>> = {};
  for (const r of reactions) {
    const forMessage = (byMessage[r.targetId] ??= new Map());
    const entry = forMessage.get(r.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (r.memberId === actorId) entry.reactedByMe = true;
    forMessage.set(r.emoji, entry);
  }

  const result: Record<string, { emoji: ReactionEmoji; count: number; reactedByMe: boolean }[]> = {};
  for (const [messageId, map] of Object.entries(byMessage)) {
    result[messageId] = Array.from(map.entries()).map(([emoji, v]) => ({ emoji, ...v }));
  }
  return result;
}

export async function getDirectConversationWithMessages(conversationId: string, actorId: string) {
  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true } } } },
      messages: { orderBy: { createdAt: "asc" }, include: MESSAGE_INCLUDE },
    },
  });
  if (!conversation) return null;

  const actorParticipant = conversation.participants.find((p) => p.memberId === actorId);
  if (!actorParticipant) return null;

  const other = conversation.participants.find((p) => p.memberId !== actorId)?.member ?? null;
  const reactionsByMessageId = await getReactionsByMessageId(
    conversation.messages.map((m) => m.id),
    actorId
  );

  return { ...conversation, other, myLastReadAt: actorParticipant.lastReadAt, reactionsByMessageId };
}

export async function getDirectConversationPollData(
  conversationId: string,
  actorId: string,
  afterMessageId?: string
) {
  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
    include: { participants: { include: { member: { select: { id: true, fullName: true } } } } },
  });
  if (!conversation) return null;

  const actorParticipant = conversation.participants.find((p) => p.memberId === actorId);
  if (!actorParticipant) return null;
  const otherParticipants = conversation.participants.filter((p) => p.memberId !== actorId);

  let afterCreatedAt: Date | undefined;
  if (afterMessageId) {
    const afterMessage = await prisma.directMessage.findUnique({
      where: { id: afterMessageId },
      select: { createdAt: true },
    });
    afterCreatedAt = afterMessage?.createdAt;
  }

  const newMessages = await prisma.directMessage.findMany({
    where: { conversationId, ...(afterCreatedAt ? { createdAt: { gt: afterCreatedAt } } : {}) },
    orderBy: { createdAt: "asc" },
    include: MESSAGE_INCLUDE,
  });

  // Reactions can land on any recently-loaded message, not just brand-new
  // ones — refresh the last 50 messages' reaction summaries every poll tick
  // so a reaction from the other participant shows up without a full reload.
  const recentMessages = await prisma.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true },
  });
  const reactionsByMessageId = await getReactionsByMessageId(
    recentMessages.map((m) => m.id),
    actorId
  );

  const typingParticipants = otherParticipants
    .filter((p) => p.typingAt && Date.now() - p.typingAt.getTime() < 5000)
    .map((p) => p.member.fullName);

  const readReceipts = otherParticipants.map((p) => ({
    memberId: p.memberId,
    name: p.member.fullName,
    lastReadAt: p.lastReadAt ? p.lastReadAt.toISOString() : null,
  }));

  return {
    newMessages,
    reactionsByMessageId,
    typingParticipants,
    // Kept for the existing 1:1 UI codepath (otherTyping/otherLastReadAt).
    otherTyping: typingParticipants.length > 0,
    otherLastReadAt: otherParticipants[0]?.lastReadAt ?? null,
    readReceipts,
  };
}
