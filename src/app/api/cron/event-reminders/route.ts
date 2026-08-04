import { NextResponse, type NextRequest } from "next/server";
import { runEventReminders } from "@/features/events/services/event-reminders.service";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results = await runEventReminders();
  return NextResponse.json({ ok: true, ...results });
}
