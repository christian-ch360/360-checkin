import { NextResponse } from "next/server";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { listConversationsForMember } from "@/features/collab-hub/services/conversation.service";

export async function GET() {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ unreadCount: 0 }, { status: 401 });
  }

  const conversations = await listConversationsForMember(member.id);
  const unreadCount = conversations.filter((c) => c.unread).length;

  return NextResponse.json({ unreadCount });
}
