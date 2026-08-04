import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { globalSearch } from "@/features/dashboard/services/search";

export async function GET(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const results = await globalSearch(member.organizationId, query);

  return NextResponse.json({ results });
}
