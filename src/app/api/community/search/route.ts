import { NextResponse } from "next/server";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { searchCommunity } from "@/features/community/services/community-post.service";

export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  const results = await searchCommunity(member.organizationId, query, member.id);
  return NextResponse.json(results);
}
