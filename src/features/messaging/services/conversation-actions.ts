"use server";

import { z } from "zod";
import { directMessageSchema, type DirectMessageInput } from "@/features/messaging/schemas/direct-message.schema";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { createNotification } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";
import { toggleReaction } from "@/features/reactions/services/reaction-actions";
import { uploadMessagingAttachment } from "@/lib/supabase/storage";
import type { ReactionEmoji } from "@prisma/client";

export type ConversationActionResult =
  | { success: true; conversationId: string }
  | { success: false; error: string };

export async function startDirectConversation(otherMemberId: string): Promise<ConversationActionResult> {
  const actor = await requireCurrentMember();
  if (otherMemberId === actor.id) {
    return { success: false, error: "You can't message yourself." };
  }

  const other = await prisma.member.findFirst({
    where: { id: otherMemberId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!other) return { success: false, error: "Member not found." };

  const existing = await prisma.directConversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { memberId: actor.id } } },
        { participants: { some: { memberId: otherMemberId } } },
      ],
    },
  });
  if (existing) return { success: true, conversationId: existing.id };

  const conversation = await prisma.directConversation.create({
    data: {
      organizationId: actor.organizationId,
      participants: { create: [{ memberId: actor.id }, { memberId: otherMemberId }] },
    },
  });

  return { success: true, conversationId: conversation.id };
}

/** Creates a group conversation — a DirectConversation{isGroup: true} with 3+ participants including the creator. */
export async function createGroupConversation(memberIds: string[], name?: string): Promise<ConversationActionResult> {
  const actor = await requireCurrentMember();

  const uniqueOtherIds = [...new Set(memberIds.filter((id) => id !== actor.id))];
  if (uniqueOtherIds.length < 2) {
    return { success: false, error: "Select at least 2 other members for a group." };
  }

  const validMembers = await prisma.member.findMany({
    where: { id: { in: uniqueOtherIds }, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (validMembers.length !== uniqueOtherIds.length) {
    return { success: false, error: "One or more selected members were not found." };
  }

  const conversation = await prisma.directConversation.create({
    data: {
      organizationId: actor.organizationId,
      isGroup: true,
      name: name?.trim() || null,
      participants: { create: [{ memberId: actor.id }, ...uniqueOtherIds.map((memberId) => ({ memberId }))] },
    },
  });

  return { success: true, conversationId: conversation.id };
}

export type SendDirectMessageResult =
  | { success: true; message: Awaited<ReturnType<typeof prisma.directMessage.create>> }
  | { success: false; error: string };

export async function sendDirectMessage(
  conversationId: string,
  input: DirectMessageInput
): Promise<SendDirectMessageResult> {
  const actor = await requireCurrentMember();

  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  });
  if (!conversation || conversation.organizationId !== actor.organizationId) {
    return { success: false, error: "Conversation not found." };
  }
  const actorParticipant = conversation.participants.find((p) => p.memberId === actor.id);
  if (!actorParticipant) return { success: false, error: "You're not part of this conversation." };

  const parsed = directMessageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid message" };

  // "Conversation Invitation" is the email sent on the first message ever in
  // a new conversation — checked before the insert below, since after it
  // there will always be at least one message.
  const isFirstMessage = (await prisma.directMessage.count({ where: { conversationId } })) === 0;

  const message = await prisma.directMessage.create({
    data: {
      conversationId,
      senderId: actor.id,
      type: parsed.data.type,
      body: "body" in parsed.data ? (parsed.data.body ?? null) : null,
      attachmentUrl: "attachmentUrl" in parsed.data ? parsed.data.attachmentUrl : null,
    },
  });

  await prisma.directConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const preview = parsed.data.type === "TEXT" ? parsed.data.body.slice(0, 120) : "Sent an attachment";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const conversationUrl = `${appUrl}/messages/dm_${conversationId}`;

  const recipients = conversation.participants.filter((p) => p.memberId !== actor.id);
  const recipientMembers = recipients.length
    ? await prisma.member.findMany({
        where: { id: { in: recipients.map((p) => p.memberId) } },
        select: { id: true, email: true, fullName: true, notifyEmail: true, organizationId: true },
      })
    : [];

  for (const participant of recipients) {
    const recentlyActive = participant.lastReadAt && Date.now() - participant.lastReadAt.getTime() < 2 * 60 * 1000;
    if (recentlyActive) continue;

    await createNotification(participant.memberId, {
      type: "DIRECT_MESSAGE_RECEIVED",
      title: `New message from ${actor.fullName}`,
      body: preview,
      link: `/messages/dm_${conversationId}`,
    });

    const member = recipientMembers.find((m) => m.id === participant.memberId);
    if (!member || !member.notifyEmail) continue;

    if (isFirstMessage) {
      await EmailService.sendConversationInvitationEmail({
        to: member.email,
        fullName: member.fullName,
        starterName: actor.fullName,
        isGroup: conversation.isGroup,
        groupName: conversation.name,
        conversationUrl,
        organizationId: member.organizationId,
        memberId: member.id,
      });
    } else if (conversation.isGroup) {
      await EmailService.sendNewGroupMessageEmail({
        to: member.email,
        fullName: member.fullName,
        senderName: actor.fullName,
        groupName: conversation.name ?? "Group chat",
        messagePreview: preview,
        conversationUrl,
        organizationId: member.organizationId,
        memberId: member.id,
      });
    } else {
      await EmailService.sendNewDirectMessageEmail({
        to: member.email,
        fullName: member.fullName,
        senderName: actor.fullName,
        messagePreview: preview,
        conversationUrl,
        organizationId: member.organizationId,
        memberId: member.id,
      });
    }
  }

  return { success: true, message };
}

/** Uploads a real file/image to Storage, then sends it the same way sendDirectMessage does — replaces the old URL-paste flow. */
export async function sendDirectMessageAttachment(conversationId: string, formData: FormData): Promise<SendDirectMessageResult> {
  const actor = await requireCurrentMember();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file selected." };
  }

  const path = `${actor.organizationId}/${conversationId}/${crypto.randomUUID()}-${file.name}`;
  const url = await uploadMessagingAttachment(path, file);
  const type = file.type.startsWith("image/") ? "IMAGE" : "FILE";

  return sendDirectMessage(conversationId, { type, attachmentUrl: url, body: file.name });
}

export async function markDirectConversationRead(conversationId: string): Promise<{ success: boolean }> {
  const actor = await requireCurrentMember();
  const participant = await prisma.directConversationParticipant.findFirst({
    where: { conversationId, memberId: actor.id },
  });
  if (!participant) return { success: false };

  await prisma.directConversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });
  return { success: true };
}

export async function setDirectTyping(conversationId: string): Promise<{ success: boolean }> {
  const actor = await requireCurrentMember();
  const participant = await prisma.directConversationParticipant.findFirst({
    where: { conversationId, memberId: actor.id },
  });
  if (!participant) return { success: false };

  await prisma.directConversationParticipant.update({
    where: { id: participant.id },
    data: { typingAt: new Date() },
  });
  return { success: true };
}

export type DirectMessageActionResult = { success: true } | { success: false; error: string };

const editMessageSchema = z.object({ body: z.string().trim().min(1, "Message can't be empty").max(2000) });

export async function editDirectMessage(messageId: string, body: string): Promise<DirectMessageActionResult> {
  const actor = await requireCurrentMember();

  const parsed = editMessageSchema.safeParse({ body });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const message = await prisma.directMessage.findFirst({
    where: { id: messageId, conversation: { organizationId: actor.organizationId } },
  });
  if (!message || message.deletedAt) return { success: false, error: "Message not found." };
  if (message.senderId !== actor.id) return { success: false, error: "You can only edit your own messages." };
  if (message.type !== "TEXT") return { success: false, error: "Only text messages can be edited." };

  await prisma.directMessage.update({
    where: { id: messageId },
    data: { body: parsed.data.body, editedAt: new Date() },
  });

  return { success: true };
}

export async function deleteDirectMessage(messageId: string): Promise<DirectMessageActionResult> {
  const actor = await requireCurrentMember();

  const message = await prisma.directMessage.findFirst({
    where: { id: messageId, conversation: { organizationId: actor.organizationId } },
  });
  if (!message) return { success: false, error: "Message not found." };
  if (message.senderId !== actor.id) return { success: false, error: "You can only delete your own messages." };

  await prisma.directMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date(), isPinned: false },
  });

  return { success: true };
}

async function setMessagePinned(messageId: string, isPinned: boolean): Promise<DirectMessageActionResult> {
  const actor = await requireCurrentMember();

  const message = await prisma.directMessage.findFirst({
    where: { id: messageId, conversation: { organizationId: actor.organizationId } },
    include: { conversation: { include: { participants: true } } },
  });
  if (!message || message.deletedAt) return { success: false, error: "Message not found." };

  const isParticipant = message.conversation.participants.some((p) => p.memberId === actor.id);
  if (!isParticipant) return { success: false, error: "You're not part of this conversation." };

  await prisma.directMessage.update({ where: { id: messageId }, data: { isPinned } });
  return { success: true };
}

export async function pinDirectMessage(messageId: string) {
  return setMessagePinned(messageId, true);
}
export async function unpinDirectMessage(messageId: string) {
  return setMessagePinned(messageId, false);
}

export async function toggleMessageReaction(messageId: string, emoji: ReactionEmoji) {
  return toggleReaction("MESSAGE", messageId, emoji);
}

export async function searchDirectMessages(query: string) {
  const actor = await requireCurrentMember();
  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.directMessage.findMany({
    where: {
      deletedAt: null,
      type: "TEXT",
      body: { contains: trimmed, mode: "insensitive" },
      conversation: { organizationId: actor.organizationId, participants: { some: { memberId: actor.id } } },
    },
    include: {
      sender: { select: { id: true, fullName: true, profilePhotoUrl: true } },
      conversation: { select: { id: true, isGroup: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function listPinnedMessages(conversationId: string) {
  const actor = await requireCurrentMember();

  const participant = await prisma.directConversationParticipant.findFirst({
    where: { conversationId, memberId: actor.id },
  });
  if (!participant) return [];

  return prisma.directMessage.findMany({
    where: { conversationId, isPinned: true, deletedAt: null },
    include: { sender: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
}
