import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import WebSocket from "ws";

loadEnv({ path: resolve(__dirname, "../.env") });
loadEnv({ path: resolve(__dirname, "../.env.local"), override: true });

async function main() {
  const prisma = new PrismaClient();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as unknown as never },
  });

  console.log("=== 1. All PENDING MembershipApplication rows ===");
  const pending = await prisma.membershipApplication.findMany({
    where: { status: "PENDING" },
    select: { id: true, email: true, fullName: true, role: true, createdAt: true, organizationId: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(JSON.stringify(pending, null, 2));

  console.log("\n=== 2. For each PENDING application's email, check Member table (ALL rows, no status/deletedAt filter) ===");
  for (const app of pending) {
    const exactMatch = await prisma.member.findMany({
      where: { email: app.email },
      select: { id: true, email: true, fullName: true, status: true, deletedAt: true, authUserId: true, organizationId: true, memberNumber: true, createdAt: true },
    });
    const ciMatch = await prisma.member.findMany({
      where: { email: { equals: app.email, mode: "insensitive" } },
      select: { id: true, email: true, fullName: true, status: true, deletedAt: true, authUserId: true, memberNumber: true },
    });
    console.log(`\nApplication ${app.id} (${app.email}, role=${app.role}):`);
    console.log("  exact-match Member rows:", JSON.stringify(exactMatch, null, 2));
    if (ciMatch.length !== exactMatch.length) {
      console.log("  case-insensitive-ONLY match Member rows (different case!):", JSON.stringify(ciMatch.filter(m => !exactMatch.some(e => e.id === m.id)), null, 2));
    }
  }

  console.log("\n=== 3. For each PENDING application's email, check Supabase Auth ===");
  for (const app of pending) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) { console.log("  listUsers error:", error.message); continue; }
    const match = data.users.find(u => u.email?.toLowerCase().trim() === app.email.toLowerCase().trim());
    console.log(`\nApplication ${app.id} (${app.email}):`);
    if (match) {
      console.log("  MATCHING Supabase Auth user found:", JSON.stringify({ id: match.id, email: match.email, created_at: match.created_at, confirmed_at: match.confirmed_at, last_sign_in_at: match.last_sign_in_at }, null, 2));
      const linkedMember = await prisma.member.findUnique({ where: { authUserId: match.id }, select: { id: true, email: true, deletedAt: true, status: true } });
      console.log("  Member row with this authUserId:", linkedMember ? JSON.stringify(linkedMember) : "NONE — ORPHANED AUTH ACCOUNT");
    } else {
      console.log("  No Supabase Auth user with this email.");
    }
  }

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
