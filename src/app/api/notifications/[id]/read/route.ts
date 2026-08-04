import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentMember } from "@/features/auth/services/current-member";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.notification.updateMany({
    where: { id, memberId: member.id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
