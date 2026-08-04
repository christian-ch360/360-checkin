import { NextResponse } from "next/server";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { getDirectConversationPollData } from "@/features/messaging/services/conversation.service";

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  const url = new URL(request.url);
  const afterMessageId = url.searchParams.get("after") ?? undefined;

  const data = await getDirectConversationPollData(conversationId, member.id, afterMessageId);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}
