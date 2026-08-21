import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import WebSocket from "ws";

// Node 20 (unlike Next.js's own server runtime, which is what production
// actually runs on) has no native WebSocket global, which
// @supabase/supabase-js's Realtime client needs merely to construct — even
// though this test never uses Realtime. This is the first test in this
// codebase to exercise getSupabaseAdmin()'s real createClient() call (via
// provisionMemberOnboarding), which doesn't take a transport option itself
// (that's an app-code concern, not something to change for a test — Next's
// runtime doesn't need this workaround). Polyfilling the global here is
// scoped to this test file only.
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

// SUPABASE_SERVICE_ROLE_KEY only lives in .env.local (vitest.config.mts's
// `dotenv/config` loads only .env, which has the placeholder) — without the
// real key, getSupabaseAdmin() returns null and provisionMemberOnboarding
// short-circuits before ever reaching the notification code this file
// tests, exactly like a real approval would with Supabase unconfigured.
// Must run before the first call to provisionMemberOnboarding (getSupabaseAdmin
// caches lazily on first call, not on import) — loaded at module scope here,
// which always runs before any test body.
loadEnv({ path: resolve(__dirname, "../../.env.local"), override: true });

// Imported dynamically, after the env override above, so the module-level
// Supabase client inside onboarding.ts's dependencies picks up the real key.
const { provisionMemberOnboarding } = await import("@/features/members/services/onboarding");

const prisma = new PrismaClient();

const runId = Date.now();
const createdMemberIds: string[] = [];
const createdAuthUserIds: string[] = [];

/**
 * "New creator joined" was the internal event that emailed every admin with
 * admin.access when a CREATOR application was approved (see
 * provisionMemberOnboarding in onboarding.ts). That email
 * (new_creator_joined_admin) has been removed in favor of the existing
 * Notification/bell system — the same conversion already done for
 * new_membership_application_admin at submission time (see
 * membership-application-admin-notification.test.ts). No new notification
 * system was introduced; this reuses notifyMembers()/Notification exactly
 * as every other in-app notification in this codebase does.
 *
 * provisionMemberOnboarding is called directly (not through
 * approveApplicationAction, which is a "use server" action requiring a real
 * authenticated session unavailable in Vitest — same convention as every
 * other integration test in this codebase) since it's the exact function
 * that owns this logic and isn't "use server"-tagged.
 */
describe("Creator-joined admin notification (no admin email)", () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: WebSocket as unknown as never },
    });
  });

  afterAll(async () => {
    for (const authUserId of createdAuthUserIds) {
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    // notifyMembers() fans out to every real admin.access holder in the
    // org (this is a single-tenant test environment — see
    // membership-application-admin-notification.test.ts for the same
    // characteristic), so the real admins get a copy of this test's
    // notification too, not just the disposable test admin created above.
    // Delete by exact title text (unique to this test run's fixture names)
    // rather than only by memberId, so no residue is left on real accounts.
    await prisma.notification.deleteMany({ where: { title: { in: ["Test New Creator just joined", "Test New Brand just joined"] } } });
    if (createdMemberIds.length) {
      await prisma.notification.deleteMany({ where: { memberId: { in: createdMemberIds } } });
      await prisma.emailLog.deleteMany({ where: { memberId: { in: createdMemberIds } } });
      await prisma.member.deleteMany({ where: { id: { in: createdMemberIds } } });
    }
    await prisma.$disconnect();
  });

  it("notifies every admin.access holder in-app and sends zero admin emails when a CREATOR is onboarded", async () => {
    const defaultOrg = await prisma.organization.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

    const admin = await prisma.member.create({
      data: {
        organizationId: defaultOrg.id,
        memberNumber: `TEST-CJN-ADMIN-${runId}`,
        fullName: "Test Admin",
        email: `test-cjn-admin-${runId}@example.com`,
        role: "STAFF",
        systemRole: "ADMIN",
        status: "ACTIVE",
      },
    });
    const nonAdmin = await prisma.member.create({
      data: {
        organizationId: defaultOrg.id,
        memberNumber: `TEST-CJN-MEMBER-${runId}`,
        fullName: "Test Non Admin",
        email: `test-cjn-nonadmin-${runId}@example.com`,
        role: "STAFF",
        systemRole: "MEMBER",
        status: "ACTIVE",
      },
    });
    createdMemberIds.push(admin.id, nonAdmin.id);

    const newCreator = await prisma.member.create({
      data: {
        organizationId: defaultOrg.id,
        memberNumber: `TEST-CJN-CREATOR-${runId}`,
        fullName: "Test New Creator",
        email: `test-cjn-creator-${runId}@example.com`,
        role: "CREATOR",
        status: "ACTIVE",
      },
    });
    createdMemberIds.push(newCreator.id);

    await provisionMemberOnboarding(newCreator, { emailTemplate: "application_approved" });

    const provisionedCreator = await prisma.member.findUniqueOrThrow({ where: { id: newCreator.id } });
    if (provisionedCreator.authUserId) createdAuthUserIds.push(provisionedCreator.authUserId);

    const expectedLink = `/members/${newCreator.id}`;

    // 1. The admin gets exactly one in-app notification, correctly typed
    // and linked to the new creator's profile.
    const adminNotifications = await prisma.notification.findMany({ where: { memberId: admin.id, link: expectedLink } });
    expect(adminNotifications).toHaveLength(1);
    expect(adminNotifications[0].type).toBe("NEW_CREATOR_JOINED");
    expect(adminNotifications[0].title).toBe("Test New Creator just joined");
    expect(adminNotifications[0].body).toContain(newCreator.memberNumber);

    // 2. A member without admin.access gets nothing for this event.
    const nonAdminNotifications = await prisma.notification.findMany({ where: { memberId: nonAdmin.id, link: expectedLink } });
    expect(nonAdminNotifications).toHaveLength(0);

    // 3. No admin email was ever sent for this event.
    const adminEmailLogs = await prisma.emailLog.findMany({
      where: { organizationId: defaultOrg.id, template: "new_creator_joined_admin", to: admin.email },
    });
    expect(adminEmailLogs).toHaveLength(0);

    // 4. The legitimate, applicant-facing account/access email is untouched.
    const creatorEmailLogs = await prisma.emailLog.findMany({
      where: { organizationId: defaultOrg.id, template: "application_approved", to: newCreator.email },
    });
    expect(creatorEmailLogs).toHaveLength(1);
    expect(creatorEmailLogs[0].status).not.toBe("QUEUED"); // fully processed (sent or failed-not-configured), not stuck
  });

  it("does not fire the creator-joined notification for a non-CREATOR onboarding", async () => {
    const defaultOrg = await prisma.organization.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

    const admin = await prisma.member.create({
      data: {
        organizationId: defaultOrg.id,
        memberNumber: `TEST-CJN-ADMIN2-${runId}`,
        fullName: "Test Admin Two",
        email: `test-cjn-admin2-${runId}@example.com`,
        role: "STAFF",
        systemRole: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    const newBrand = await prisma.member.create({
      data: {
        organizationId: defaultOrg.id,
        memberNumber: `TEST-CJN-BRAND-${runId}`,
        fullName: "Test New Brand",
        email: `test-cjn-brand-${runId}@example.com`,
        role: "BRAND",
        status: "ACTIVE",
      },
    });
    createdMemberIds.push(admin.id, newBrand.id);

    await provisionMemberOnboarding(newBrand, { emailTemplate: "application_approved" });

    const provisionedBrand = await prisma.member.findUniqueOrThrow({ where: { id: newBrand.id } });
    if (provisionedBrand.authUserId) createdAuthUserIds.push(provisionedBrand.authUserId);

    const notifications = await prisma.notification.findMany({ where: { memberId: admin.id, link: `/members/${newBrand.id}` } });
    expect(notifications).toHaveLength(0);
  });
});
