import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { isDemoModeActive, demoListRecentNotifications } from "@/features/demo-data";

export async function GET() {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 401 });
  }

  if (isDemoModeActive(member)) {
    return NextResponse.json(demoListRecentNotifications());
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        createdAt: true,
        readAt: true,
        link: true,
      },
    }),
    prisma.notification.count({
      where: { memberId: member.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
