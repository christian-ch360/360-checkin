import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { PROVIDERS } from "@/features/integrations/config/providers";

/**
 * Exercises the real fetchStats/buildAuthorizeUrl code paths against
 * simulated API responses shaped exactly like Instagram/TikTok/YouTube's
 * actual documented payloads — the closest thing to an end-to-end check
 * possible without a live OAuth round-trip through a real third-party
 * consent screen (which needs real developer-app credentials and a deployed
 * callback URL, and can't be driven from an automated test).
 */
describe("social provider fetchStats", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.INSTAGRAM_CLIENT_ID = "test-ig-client";
    process.env.INSTAGRAM_CLIENT_SECRET = "test-ig-secret";
    process.env.TIKTOK_CLIENT_KEY = "test-tt-key";
    process.env.TIKTOK_CLIENT_SECRET = "test-tt-secret";
    process.env.GOOGLE_YOUTUBE_CLIENT_ID = "test-yt-client";
    process.env.GOOGLE_YOUTUBE_CLIENT_SECRET = "test-yt-secret";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("parses a real-shaped Instagram Graph API response into a follower count", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user_id: "17841400000000000",
        username: "janecreator",
        followers_count: 48213,
        follows_count: 512,
        media_count: 340,
        profile_picture_url: "https://scontent.cdninstagram.com/avatar.jpg",
        account_type: "CREATOR",
      }),
    }) as unknown as typeof fetch;

    const stats = await PROVIDERS.INSTAGRAM.fetchStats("fake-access-token");

    expect(stats.followerCount).toBe(48213);
    expect(stats.externalUsername).toBe("janecreator");
    expect(stats.followingCount).toBe(512);
    expect(stats.postCount).toBe(340);
    expect(stats.accountType).toBe("CREATOR");
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("https://graph.instagram.com/"));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("followers_count"));
  });

  it("throws (not silently returns null) when Instagram rejects the request", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: "Invalid OAuth access token" } }),
    }) as unknown as typeof fetch;

    await expect(PROVIDERS.INSTAGRAM.fetchStats("expired-token")).rejects.toThrow(/Instagram profile fetch failed/);
  });

  it("requests all three post-migration TikTok scopes (basic + profile + stats)", () => {
    const url = PROVIDERS.TIKTOK.buildAuthorizeUrl("https://app.example.com/callback", "state123");
    const scope = new URL(url).searchParams.get("scope");

    // Regression guard: username needs user.info.profile and follower/
    // following/likes counts need user.info.stats (TikTok's Feb 2024 scope
    // migration) — requesting fields without the matching scope returns a
    // 401 scope_not_authorized for the whole call, not just that field.
    expect(scope).toContain("user.info.basic");
    expect(scope).toContain("user.info.profile");
    expect(scope).toContain("user.info.stats");
  });

  it("parses a real-shaped TikTok user info response into a follower count", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            open_id: "abc123open",
            username: "janecreator",
            follower_count: 91832,
            following_count: 218,
            likes_count: 2_400_000,
            avatar_url: "https://p16-sign.tiktokcdn.com/avatar.jpg",
            is_verified: true,
          },
        },
        error: { code: "ok", message: "" },
      }),
    }) as unknown as typeof fetch;

    const stats = await PROVIDERS.TIKTOK.fetchStats("fake-access-token");

    expect(stats.followerCount).toBe(91832);
    expect(stats.followingCount).toBe(218);
    expect(stats.likesCount).toBe(2_400_000);
    expect(stats.externalUsername).toBe("janecreator");
    expect(stats.verified).toBe(true);
  });

  it("throws when TikTok returns a scope_not_authorized-style error body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { code: "scope_not_authorized", message: "scope not authorized" } }),
    }) as unknown as typeof fetch;

    await expect(PROVIDERS.TIKTOK.fetchStats("token-missing-scope")).rejects.toThrow(/TikTok user fetch failed/);
  });

  it("parses a real-shaped YouTube Data API v3 response into a subscriber count", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "UC1234567890",
            snippet: { title: "Jane Creates", thumbnails: { default: { url: "https://yt3.ggpht.com/avatar.jpg" } } },
            statistics: { subscriberCount: "12500", videoCount: "87" },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const stats = await PROVIDERS.YOUTUBE.fetchStats("fake-access-token");

    expect(stats.followerCount).toBe(12500);
    expect(stats.postCount).toBe(87);
    expect(stats.externalUsername).toBe("Jane Creates");
  });
});
