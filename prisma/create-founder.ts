import "dotenv/config";
import { randomBytes, createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const prisma = new PrismaClient();

const FOUNDER_EMAIL = "cjbipat@gmail.com";
const FOUNDER_NAME = "Christian Bipat";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Mirrors src/features/members/services/member-number.ts's format/logic —
// duplicated rather than imported since that module is "server-only" tagged
// for the Next.js app; this script runs outside Next's bundler entirely.
function nextMemberNumber(existingCount: number): string {
  return `CH360-${String(existingCount + 1).padStart(6, "0")}`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }
  // Node 20 has no native WebSocket global; @supabase/supabase-js's Realtime
  // module needs one to even construct, though this script never uses Realtime.
  // flowType "pkce" matters: the app's own auth (@supabase/ssr's browser/server
  // clients) uses PKCE, and src/app/auth/callback/route.ts only knows how to
  // exchange a `?code=` — the plain client's "implicit" default would instead
  // deliver tokens in a URL fragment that never reaches that server route.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { flowType: "pkce" },
    realtime: { transport: WebSocket as unknown as never },
  });

  console.log("Step 1/6 — Organization");
  const org = await prisma.organization.upsert({
    where: { slug: "creatorhub360" },
    update: {},
    create: { name: "CreatorHub360", slug: "creatorhub360" },
  });
  console.log(`  using "${org.name}" (${org.id})`);

  console.log("Step 2/6 — Clearing demo members");
  const demoMembers = await prisma.member.findMany({ select: { id: true, memberNumber: true, fullName: true } });
  for (const m of demoMembers) {
    await prisma.member.delete({ where: { id: m.id } });
    console.log(`  deleted ${m.memberNumber} — ${m.fullName}`);
  }
  if (demoMembers.length === 0) console.log("  none found");

  const existingFounder = await prisma.member.findUnique({ where: { email: FOUNDER_EMAIL } });
  if (existingFounder) {
    throw new Error(`A member with email ${FOUNDER_EMAIL} already exists (${existingFounder.memberNumber}). Aborting.`);
  }

  console.log("Step 3/6 — Supabase Auth account");
  const oneTimePassword = randomBytes(24).toString("base64url"); // generated, used once, never logged or stored
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: FOUNDER_EMAIL,
    password: oneTimePassword,
    options: { data: { full_name: FOUNDER_NAME } },
  });
  if (signUpError || !signUpData.user) {
    throw new Error(`Supabase signUp failed: ${signUpError?.message ?? "no user returned"}`);
  }
  console.log(`  created auth user ${signUpData.user.id}`);

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(FOUNDER_EMAIL, {
    redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
  });
  if (resetError) {
    console.warn(`  warning: could not send password-reset email: ${resetError.message}`);
  } else {
    console.log("  password-reset email requested");
  }

  console.log("Step 4/6 — Commission tier");
  const tierA = await prisma.commissionTier.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "A" } },
    update: { percentage: 12 },
    create: { organizationId: org.id, code: "A", name: "Tier A", percentage: 12 },
  });

  console.log("Step 5/6 — Member record");
  const totalMembers = await prisma.member.count();
  const memberNumber = nextMemberNumber(totalMembers);
  const member = await prisma.member.create({
    data: {
      organizationId: org.id,
      memberNumber,
      authUserId: signUpData.user.id,
      fullName: FOUNDER_NAME,
      email: FOUNDER_EMAIL,
      role: "BUSINESS_DEVELOPMENT",
      systemRole: "SUPER_ADMIN",
      commissionTierId: tierA.id,
      status: "ACTIVE",
    },
  });
  console.log(`  created ${member.memberNumber} — ${member.fullName} (SUPER_ADMIN)`);

  console.log("Step 6/6 — Permanent QR badge");
  const qrAsset = await prisma.qRAsset.create({
    data: { type: "MEMBER", token: generateFounderQrToken(), memberId: member.id },
  });
  console.log(`  badge ready (qr asset ${qrAsset.id})`);

  console.log("\nDone.");
  console.log(`  Member number : ${member.memberNumber}`);
  console.log(`  Email         : ${member.email}`);
  console.log(`  Role          : SUPER_ADMIN (every permission)`);
  console.log(`  Next steps    : check ${member.email} for a "reset your password" email from Supabase,`);
  console.log(`                  set a real password, then sign in at ${APP_URL}/login`);
}

function generateFounderQrToken(): string {
  // Same token shape as src/features/qr/services/qr-token.ts's generateQRToken,
  // duplicated because that module is "server-only"-tagged (throws when imported
  // outside Next's RSC bundler condition, which this standalone script isn't).
  const secret = process.env.QR_SECRET;
  if (!secret) throw new Error("QR_SECRET environment variable is not set");
  const random = randomBytes(16).toString("hex");
  const payload = `MEMBER.${random}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 24);
  return `${payload}.${signature}`;
}

main()
  .catch((err) => {
    console.error("\nFailed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
