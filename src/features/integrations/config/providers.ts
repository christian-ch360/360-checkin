import "server-only";

import type { SocialPlatform } from "@prisma/client";

export type OAuthTokenResult = { accessToken: string; refreshToken: string | null; expiresInSec: number | null };
export type ProfileStatsResult = {
  externalAccountId: string;
  externalUsername: string | null;
  followerCount: number | null;
  profileImageUrl: string | null;
  followingCount: number | null;
  postCount: number | null;
  likesCount: number | null;
  accountType: string | null; // Instagram only ("PERSONAL" | "BUSINESS" | "MEDIA_CREATOR"); null elsewhere
};

export type PlatformProvider = {
  label: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  buildAuthorizeUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResult>;
  fetchStats(accessToken: string): Promise<ProfileStatsResult>;
  /** Optional — only platforms that support a real refresh flow implement this. */
  refreshToken?(refreshToken: string): Promise<OAuthTokenResult>;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

export function isPlatformConfigured(platform: SocialPlatform): boolean {
  const provider = PROVIDERS[platform];
  return Boolean(process.env[provider.clientIdEnv] && process.env[provider.clientSecretEnv]);
}

// --- YouTube (Google OAuth2 + YouTube Data API v3) --------------------------
// Standard Google OAuth2. `youtube.readonly` is a "sensitive" scope — Google
// requires app verification for it to work beyond a handful of manually
// added test users while the OAuth consent screen is in "Testing" mode.
const youtube: PlatformProvider = {
  label: "YouTube",
  clientIdEnv: "GOOGLE_YOUTUBE_CLIENT_ID",
  clientSecretEnv: "GOOGLE_YOUTUBE_CLIENT_SECRET",
  buildAuthorizeUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_id: requireEnv("GOOGLE_YOUTUBE_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },
  async exchangeCode(code, redirectUri) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: requireEnv("GOOGLE_YOUTUBE_CLIENT_ID"),
        client_secret: requireEnv("GOOGLE_YOUTUBE_CLIENT_SECRET"),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`YouTube token exchange failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null, expiresInSec: data.expires_in ?? null };
  },
  // Google issues a refresh_token because buildAuthorizeUrl above requests
  // access_type=offline&prompt=consent — this is what actually consumes it.
  async refreshToken(refreshToken) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: requireEnv("GOOGLE_YOUTUBE_CLIENT_ID"),
        client_secret: requireEnv("GOOGLE_YOUTUBE_CLIENT_SECRET"),
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`YouTube token refresh failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    // Google does not re-issue a refresh_token on refresh — keep the one we already have.
    return { accessToken: data.access_token, refreshToken, expiresInSec: data.expires_in ?? null };
  },
  async fetchStats(accessToken) {
    const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`YouTube channel fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const channel = data.items?.[0];
    if (!channel) throw new Error("No YouTube channel found for this account");
    return {
      externalAccountId: channel.id,
      externalUsername: channel.snippet?.title ?? null,
      followerCount: channel.statistics?.subscriberCount != null ? Number(channel.statistics.subscriberCount) : null,
      profileImageUrl: channel.snippet?.thumbnails?.default?.url ?? null,
      followingCount: null, // YouTube's public API has no "channels I'm following" count
      postCount: channel.statistics?.videoCount != null ? Number(channel.statistics.videoCount) : null,
      likesCount: null,
      accountType: null,
    };
  },
};

// --- Instagram (Instagram API with Instagram Login) -------------------------
// The newer "Business Login for Instagram" flow — doesn't require a linked
// Facebook Page (unlike the older Instagram Graph API via Facebook Login).
// `instagram_business_basic` still requires Meta App Review before it works
// for any account beyond the app's own registered testers.
const instagram: PlatformProvider = {
  label: "Instagram",
  clientIdEnv: "INSTAGRAM_CLIENT_ID",
  clientSecretEnv: "INSTAGRAM_CLIENT_SECRET",
  buildAuthorizeUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_id: requireEnv("INSTAGRAM_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "instagram_business_basic",
      state,
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode(code, redirectUri) {
    const res = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: requireEnv("INSTAGRAM_CLIENT_ID"),
        client_secret: requireEnv("INSTAGRAM_CLIENT_SECRET"),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`Instagram token exchange failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const shortLivedToken: string = data.access_token;

    // Instagram's initial exchange only ever returns a short-lived (~1hr)
    // token. Immediately upgrade it to a 60-day long-lived token so the
    // connection is actually refreshable — see refreshToken() below.
    const longLived = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${requireEnv("INSTAGRAM_CLIENT_SECRET")}&access_token=${shortLivedToken}`
    );
    if (!longLived.ok) throw new Error(`Instagram long-lived token exchange failed: ${longLived.status} ${await longLived.text()}`);
    const longLivedData = await longLived.json();
    return {
      accessToken: longLivedData.access_token,
      // Instagram has no distinct refresh-token string — the long-lived
      // access token itself is what gets refreshed (see refreshToken()).
      // We store a copy of it in refreshTokenEnc purely so the generic
      // ensureFreshAccessToken() helper has a non-null value to trigger on.
      refreshToken: longLivedData.access_token,
      expiresInSec: longLivedData.expires_in ?? null,
    };
  },
  // Instagram-specific convention: the "refresh token" passed in here is
  // actually a copy of the current long-lived access token (see exchangeCode
  // above) — Instagram's API refreshes a long-lived token using itself,
  // there's no separate refresh-token concept. Do not "fix" this into a
  // standard refresh_token grant; Instagram doesn't have one.
  async refreshToken(refreshToken) {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`
    );
    if (!res.ok) throw new Error(`Instagram token refresh failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.access_token, expiresInSec: data.expires_in ?? null };
  },
  async fetchStats(accessToken) {
    const res = await fetch(
      `https://graph.instagram.com/v22.0/me?fields=user_id,username,followers_count,follows_count,media_count,profile_picture_url,account_type&access_token=${accessToken}`
    );
    if (!res.ok) throw new Error(`Instagram profile fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      externalAccountId: data.user_id ?? data.id,
      externalUsername: data.username ?? null,
      followerCount: data.followers_count != null ? Number(data.followers_count) : null,
      profileImageUrl: data.profile_picture_url ?? null,
      followingCount: data.follows_count != null ? Number(data.follows_count) : null,
      postCount: data.media_count != null ? Number(data.media_count) : null,
      likesCount: null,
      accountType: data.account_type ?? null,
    };
  },
};

// --- TikTok (Login Kit v2) ---------------------------------------------------
// TikTok's OAuth params use `client_key`, not `client_id` — the one real
// naming divergence from the other two providers here.
const tiktok: PlatformProvider = {
  label: "TikTok",
  clientIdEnv: "TIKTOK_CLIENT_KEY",
  clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  buildAuthorizeUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_key: requireEnv("TIKTOK_CLIENT_KEY"),
      redirect_uri: redirectUri,
      response_type: "code",
      // TikTok split its original single user.info.basic scope into three
      // (Feb 2024 migration): user.info.basic (avatar/display name only),
      // user.info.profile (username + bio), user.info.stats (follower/
      // following/likes counts). fetchStats below reads fields from both of
      // the latter two — requesting only user.info.basic+stats (the old
      // pairing) causes TikTok to reject the whole call with
      // scope_not_authorized as soon as `username` is in the field list.
      scope: "user.info.basic,user.info.profile,user.info.stats",
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  },
  async exchangeCode(code, redirectUri) {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_key: requireEnv("TIKTOK_CLIENT_KEY"),
        client_secret: requireEnv("TIKTOK_CLIENT_SECRET"),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`TikTok token exchange failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null, expiresInSec: data.expires_in ?? null };
  },
  async refreshToken(refreshToken) {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: requireEnv("TIKTOK_CLIENT_KEY"),
        client_secret: requireEnv("TIKTOK_CLIENT_SECRET"),
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`TikTok token refresh failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token ?? refreshToken, expiresInSec: data.expires_in ?? null };
  },
  async fetchStats(accessToken) {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,follower_count,following_count,likes_count,avatar_url",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`TikTok user fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const user = data.data?.user;
    if (!user) throw new Error("No TikTok user info returned");
    return {
      externalAccountId: user.open_id,
      externalUsername: user.username ?? null,
      followerCount: user.follower_count != null ? Number(user.follower_count) : null,
      profileImageUrl: user.avatar_url ?? null,
      followingCount: user.following_count != null ? Number(user.following_count) : null,
      // TikTok's user.info.basic/user.info.stats scopes don't expose a video
      // count — deeper "creator metrics" (engagement rate, per-video
      // performance) need additional scopes requiring TikTok app review.
      postCount: null,
      likesCount: user.likes_count != null ? Number(user.likes_count) : null,
      accountType: null,
    };
  },
};

export const PROVIDERS: Record<SocialPlatform, PlatformProvider> = { INSTAGRAM: instagram, TIKTOK: tiktok, YOUTUBE: youtube };
