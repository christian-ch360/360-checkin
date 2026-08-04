import { NextResponse, type NextRequest } from "next/server";
import { runScheduledSync } from "@/features/integrations/services/scheduled-sync.service";

// Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when
// CRON_SECRET is set as a project env var and this route is listed in
// vercel.json's `crons` — this is Vercel's documented mechanism, no bespoke
// auth scheme needed.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results = await runScheduledSync();
  return NextResponse.json({ ok: true, ...results });
}
