import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentMember } from "@/features/auth/services/current-member";

export async function POST() {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.notification.updateMany({
    where: { memberId: member.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
