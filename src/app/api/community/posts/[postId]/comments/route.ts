import { NextResponse } from "next/server";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { listCommunityComments } from "@/features/community/services/community-post.service";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, organizationId: member.organizationId },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comments = await listCommunityComments(postId);
  return NextResponse.json({ comments });
}
