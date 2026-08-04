"use server";

import { messageSchema, type MessageInput } from "@/features/collab-hub/schemas/message.schema";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { createNotification } from "@/lib/notifications";

export type ConversationActionResult =
  | { success: true; conversationId: string }
  | { success: false; error: string };

async function upsertConversation(
  organizationId: string,
  postId: string,
  posterId: string,
  initiatorId: string
) {
  return prisma.conversation.upsert({
    where: { collabPostId_initiatorId: { collabPostId: postId, initiatorId } },
    create: { organizationId, collabPostId: postId, posterId, initiatorId },
    update: {},
  });
}

export async function startConversation(postId: string): Promise<ConversationActionResult> {
  const actor = await requireCurrentMember();

  const post = await prisma.collabPost.findFirst({
    where: { id: postId, organizationId: actor.organizationId },
  });
  if (!post) return { success: false, error: "Collaboration post not found." };
  if (post.memberId === actor.id) {
    return { success: false, error: "You can't message yourself about your own post." };
  }

  const conversation = await upsertConversation(actor.organizationId, postId, post.memberId, actor.id);
  return { success: true, conversationId: conversation.id };
}

export async function startConversationWithApplicant(
  postId: string,
  applicantId: string
): Promise<ConversationActionResult> {
  const actor = await requireCurrentMember();

  const post = await prisma.collabPost.findFirst({
    where: { id: postId, organizationId: actor.organizationId },
  });
  if (!post) return { success: false, error: "Collaboration post not found." };
  if (post.memberId !== actor.id) {
    return { success: false, error: "Only the post owner can message applicants this way." };
  }

  const conversation = await upsertConversation(actor.organizationId, postId, post.memberId, applicantId);
  return { success: true, conversationId: conversation.id };
}

export type SendMessageResult =
  | {
      success: true;
      message: Awaited<ReturnType<typeof prisma.message.create>>;
    }
  | { success: false; error: string };

export async function sendMessage(conversationId: string, input: MessageInput): Promise<SendMessageResult> {
  const actor = await requireCurrentMember();

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.organizationId !== actor.organizationId) {
    return { success: false, error: "Conversation not found." };
  }
  if (conversation.posterId !== actor.id && conversation.initiatorId !== actor.id) {
    return { success: false, error: "You're not part of this conversation." };
  }

  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid message" };

  if (parsed.data.type === "PROJECT_REF") {
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectRefId, organizationId: actor.organizationId },
      select: { id: true },
    });
    if (!project) return { success: false, error: "Project not found." };
  }
  if (parsed.data.type === "RESERVATION_REF") {
    const reservation = await prisma.reservation.findFirst({
      where: { id: parsed.data.reservationRefId, organizationId: actor.organizationId },
      select: { id: true },
    });
    if (!reservation) return { success: false, error: "Reservation not found." };
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: actor.id,
      type: parsed.data.type,
      body: "body" in parsed.data ? (parsed.data.body ?? null) : null,
      attachmentUrl: "attachmentUrl" in parsed.data ? parsed.data.attachmentUrl : null,
      projectRefId: parsed.data.type === "PROJECT_REF" ? parsed.data.projectRefId : null,
      reservationRefId: parsed.data.type === "RESERVATION_REF" ? parsed.data.reservationRefId : null,
    },
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const isPoster = conversation.posterId === actor.id;
  const otherId = isPoster ? conversation.initiatorId : conversation.posterId;
  const otherLastReadAt = isPoster ? conversation.initiatorLastReadAt : conversation.posterLastReadAt;
  const recentlyActive = otherLastReadAt && Date.now() - otherLastReadAt.getTime() < 2 * 60 * 1000;

  if (!recentlyActive) {
    const other = await prisma.member.findUnique({
      where: { id: otherId },
      select: { notifyCollabRequests: true },
    });
    if (other?.notifyCollabRequests) {
      await createNotification(otherId, {
        type: "COLLAB_MESSAGE_RECEIVED",
        title: `New message from ${actor.fullName}`,
        body: parsed.data.type === "TEXT" ? parsed.data.body.slice(0, 120) : "Sent an attachment",
        link: `/messages/${conversationId}`,
      });
    }
  }

  return { success: true, message };
}

export async function markConversationRead(conversationId: string): Promise<{ success: boolean }> {
  const actor = await requireCurrentMember();
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return { success: false };
  if (conversation.posterId !== actor.id && conversation.initiatorId !== actor.id) return { success: false };

  const isPoster = conversation.posterId === actor.id;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: isPoster ? { posterLastReadAt: new Date() } : { initiatorLastReadAt: new Date() },
  });
  return { success: true };
}

export async function setTyping(conversationId: string): Promise<{ success: boolean }> {
  const actor = await requireCurrentMember();
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return { success: false };
  if (conversation.posterId !== actor.id && conversation.initiatorId !== actor.id) return { success: false };

  const isPoster = conversation.posterId === actor.id;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: isPoster ? { posterTypingAt: new Date() } : { initiatorTypingAt: new Date() },
  });
  return { success: true };
}
