import { NextResponse } from "next/server";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "events.manage")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const event = await prisma.event.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: {
      rsvps: { include: { member: { select: { fullName: true, email: true, memberNumber: true } } } },
      checkIns: { select: { memberId: true, checkedInAt: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const checkedInAt = new Map(event.checkIns.map((c) => [c.memberId, c.checkedInAt]));

  const rows = [
    ["Name", "Email", "Member #", "RSVP Status", "Checked In", "Check-in Time"],
    ...event.rsvps.map((r) => {
      const checkin = checkedInAt.get(r.memberId);
      return [
        r.member.fullName,
        r.member.email,
        r.member.memberNumber,
        r.status,
        checkin ? "Yes" : "No",
        checkin ? checkin.toISOString() : "",
      ];
    }),
  ];

  const csv = rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-z0-9]+/gi, "-")}-attendees.csv"`,
    },
  });
}
