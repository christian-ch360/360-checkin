import { NextResponse } from "next/server";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { getUnreadMessageCount } from "@/features/messaging/services/conversation.service";

export async function GET() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ unreadCount: 0 }, { status: 401 });

  const unreadCount = await getUnreadMessageCount(member.id);
  return NextResponse.json({ unreadCount });
}
