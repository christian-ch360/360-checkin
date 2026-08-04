import { NextResponse } from "next/server";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { searchMembersForDm } from "@/features/messaging/services/member-search.service";

export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  const results = await searchMembersForDm(member.organizationId, query, member.id);
  return NextResponse.json({ results });
}
