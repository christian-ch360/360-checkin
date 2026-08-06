import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { syncConnection } from "@/features/integrations/services/social-connections.service";
import { getFollowerGrowth } from "@/features/integrations/services/follower-growth.service";
import { encryptToken } from "@/lib/crypto/token-cipher";

const prisma = new PrismaClient();
const runId = Date.now();
let organizationId: string;
let memberId: string;

describe("social follower sync + history (integration, real Postgres)", () => {
  beforeAll(async () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY ??= "test-integrations-encryption-key";

    const org = await prisma.organization.create({
      data: { name: `Test Org ${runId}`, slug: `test-org-social-${runId}` },
    });
    organizationId = org.id;

    const member = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-SOCIAL-${runId}`,
        fullName: "Social Test Creator",
        email: `social-test-${runId}@example.com`,
        role: "CREATOR",
      },
    });
    memberId = member.id;
  });

  afterAll(async () => {
    await prisma.socialFollowerHistory.deleteMany({ where: { memberId } });
    await prisma.socialConnection.deleteMany({ where: { memberId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends a SocialFollowerHistory row on a successful sync and updates the connection's live count", async () => {
    await prisma.socialConnection.create({
      data: {
        memberId,
        platform: "INSTAGRAM",
        status: "CONNECTED",
        externalUsername: "creator1",
        followerCount: 1000,
        accessTokenEnc: encryptToken("fake-access-token"),
        tokenExpiresAt: null,
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user_id: "17841400000000000",
        username: "creator1",
        followers_count: 1050,
        follows_count: 10,
        media_count: 5,
        profile_picture_url: null,
        account_type: "CREATOR",
      }),
    }) as unknown as typeof fetch;

    await syncConnection(memberId, "INSTAGRAM");

    const history = await prisma.socialFollowerHistory.findMany({
      where: { memberId, platform: "INSTAGRAM" },
      orderBy: { capturedAt: "asc" },
    });
    expect(history).toHaveLength(1);
    expect(history[0].followers).toBe(1050);

    const connection = await prisma.socialConnection.findUniqueOrThrow({
      where: { memberId_platform: { memberId, platform: "INSTAGRAM" } },
    });
    expect(connection.followerCount).toBe(1050);
    expect(connection.profileUrl).toBe("https://instagram.com/creator1");
    expect(connection.lastSyncedAt).not.toBeNull();
    expect(connection.lastSyncError).toBeNull();
  });

  it("does not append history and preserves the previous follower count when a sync fails", async () => {
    // Push lastSyncAttempt into the past so this attempt isn't rejected by
    // the in-flight claim from the previous test.
    await prisma.socialConnection.update({
      where: { memberId_platform: { memberId, platform: "INSTAGRAM" } },
      data: { lastSyncAttempt: new Date(Date.now() - 60_000) },
    });

    const before = await prisma.socialConnection.findUniqueOrThrow({
      where: { memberId_platform: { memberId, platform: "INSTAGRAM" } },
    });
    const historyCountBefore = await prisma.socialFollowerHistory.count({ where: { memberId, platform: "INSTAGRAM" } });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: "Invalid OAuth access token" } }),
    }) as unknown as typeof fetch;

    await expect(syncConnection(memberId, "INSTAGRAM")).rejects.toThrow();

    const historyCountAfter = await prisma.socialFollowerHistory.count({ where: { memberId, platform: "INSTAGRAM" } });
    expect(historyCountAfter).toBe(historyCountBefore);

    const after = await prisma.socialConnection.findUniqueOrThrow({
      where: { memberId_platform: { memberId, platform: "INSTAGRAM" } },
    });
    expect(after.followerCount).toBe(before.followerCount);
    expect(after.status).toBe("ERROR");
    expect(after.lastSyncError).not.toBeNull();
    expect(after.lastSyncAttempt).not.toBeNull();
  });

  it("rejects a second sync attempt while one is already in flight on the same connection", async () => {
    await prisma.socialConnection.update({
      where: { memberId_platform: { memberId, platform: "INSTAGRAM" } },
      data: { status: "CONNECTED", lastSyncError: null, lastSyncAttempt: new Date() },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user_id: "x", username: "creator1", followers_count: 1100 }),
    }) as unknown as typeof fetch;

    await expect(syncConnection(memberId, "INSTAGRAM")).rejects.toThrow(/already running/);
    // The rejected attempt must never have touched fetch or written history.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("preserves follower history after disconnect", async () => {
    const historyBefore = await prisma.socialFollowerHistory.count({ where: { memberId, platform: "INSTAGRAM" } });
    expect(historyBefore).toBeGreaterThan(0);

    await prisma.socialConnection.update({
      where: { memberId_platform: { memberId, platform: "INSTAGRAM" } },
      data: { status: "DISCONNECTED", accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null },
    });

    const historyAfter = await prisma.socialFollowerHistory.count({ where: { memberId, platform: "INSTAGRAM" } });
    expect(historyAfter).toBe(historyBefore);
  });

  it("computes today/7d/30d/90d/lifetime growth deltas and 7-day trend % from history rows", async () => {
    await prisma.socialConnection.create({
      data: { memberId, platform: "TIKTOK", status: "CONNECTED", followerCount: 1500, accessTokenEnc: encryptToken("fake") },
    });

    const now = Date.now();
    const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

    await prisma.socialFollowerHistory.createMany({
      data: [
        { memberId, platform: "TIKTOK", followers: 1000, capturedAt: daysAgo(90) },
        { memberId, platform: "TIKTOK", followers: 1200, capturedAt: daysAgo(30) },
        { memberId, platform: "TIKTOK", followers: 1400, capturedAt: daysAgo(7) },
        { memberId, platform: "TIKTOK", followers: 1480, capturedAt: daysAgo(1) },
      ],
    });

    const growth = await getFollowerGrowth(memberId, "TIKTOK", 1500);

    expect(growth.current).toBe(1500);
    expect(growth.todayDelta).toBe(20);
    expect(growth.sevenDayDelta).toBe(100);
    expect(growth.thirtyDayDelta).toBe(300);
    expect(growth.ninetyDayDelta).toBe(500);
    expect(growth.lifetimeDelta).toBe(500);
    expect(growth.trendPercent).toBeCloseTo((100 / 1400) * 100, 5);
  });

  it("returns the empty shape for a platform with no follower count yet", async () => {
    const growth = await getFollowerGrowth(memberId, "INSTAGRAM", null);
    expect(growth.current).toBeNull();
    expect(growth.sevenDayDelta).toBeNull();
    expect(growth.trendPercent).toBeNull();
  });
});
