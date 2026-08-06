# Social Integrations Audit — Instagram / TikTok / YouTube Follower Sync

Audited 2026-07-29. Scope: verify that follower counts shown on member
profiles come from real, live platform APIs rather than mocked or
placeholder data, fix anything that doesn't, and document what each
platform's API will and won't give us.

## Result: not mocked — real API calls, one real bug found and fixed

Every code path that produces a follower count (`src/features/integrations/config/providers.ts`)
makes a genuine `fetch()` to the platform's live REST API using the
member's own OAuth access token. There is no hardcoded number, no
random/demo generator, and no stub in this path. (The unrelated demo-data
module used for internal demos generates a fake `Member.followerCount` for
seed data — that's a separate, clearly-scoped feature gated behind demo
mode and never touches the `SocialConnection` table or the sync pipeline
described here.)

That said, the audit found **one real, production-blocking bug** in the
TikTok integration, fixed below, plus one aging API version bumped for
headroom.

## Bug found and fixed: TikTok OAuth scope was missing `user.info.profile`

**Before:** `buildAuthorizeUrl` requested `scope: "user.info.basic,user.info.stats"`.
`fetchStats` then requested the `username` field from `/v2/user/info/`.

**The problem:** TikTok split its original `user.info.basic` scope into
three in a mandatory migration (deadline Feb 29, 2024, confirmed via
TikTok's own [scope migration bulletin](https://developers.tiktok.com/bulletin/user-info-scope-migration)):

| Field | Scope required |
|---|---|
| `avatar_url`, `open_id`, `display_name` | `user.info.basic` |
| `username`, `bio_description` | `user.info.profile` |
| `follower_count`, `following_count`, `likes_count` | `user.info.stats` |

Requesting a field without its matching scope doesn't just omit that
field — per TikTok's docs, the whole call fails with
`401 scope_not_authorized`. Since this app's OAuth authorize URL never
requested `user.info.profile`, but `fetchStats` always asks for `username`,
**every TikTok connection attempt would have failed outright** — no
follower count, no username, nothing, just an auth error.

**Fix:** `scope` now requests all three: `user.info.basic,user.info.profile,user.info.stats`.

Source: [TikTok User Info Scope Migration bulletin](https://developers.tiktok.com/bulletin/user-info-scope-migration), [TikTok User Information API docs](https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info).

## Instagram: version bump for headroom

Endpoints, domains, and scope name were all verified correct against
Meta's current docs (`www.instagram.com/oauth/authorize` →
`api.instagram.com/oauth/access_token` → `graph.instagram.com` for the
long-lived exchange, refresh, and `/me` profile fetch; `instagram_business_basic`
scope). The only issue was the pinned Graph API version, `v21.0`, which —
per Meta's [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog)
(every version is supported for a guaranteed 2 years from release) — still
works today but has limited remaining runway. Bumped to `v22.0` for more
headroom; this needs periodic revisiting (see Operational Notes below).

## Platform limitations (confirmed against current docs, not assumed)

### Both Instagram and TikTok require App Review before real members can connect

Both platforms restrict a new app to **manually-added testers only** until
Meta/TikTok complete an app review:

- **Instagram** — `instagram_business_basic` starts with only Standard
  Access. Getting **Advanced Access** (required for any account beyond
  the app's own registered testers) needs Meta App Review: business
  verification, a live-mode app, a privacy policy, a data-deletion path, a
  written use-case description, and a screencast of the full OAuth +
  data-rendering flow. Typically 2–4 weeks.
- **TikTok** — `user.info.basic` (avatar + display name) works
  immediately, but **`user.info.stats` — the scope this integration needs
  for follower counts — requires pre-approval** even to use in Sandbox
  testing, and a full review (with a demo video) to go to Production.
  Typically several days to two weeks.

**Practical effect:** until whoever owns the Meta and TikTok developer
apps for this org completes those reviews, only accounts added as
testers/developers in each platform's dashboard will be able to connect —
every other member's Connect button will reach the real OAuth consent
screen but get rejected by the platform itself, not by this app. This is
expected, matches the app's own `.env.example` comment, and isn't
something app code can route around.

### Instagram

- Requires a **Business or Creator** Instagram account. A personal account
  can start the OAuth flow but the app already detects this
  (`account_type === "PERSONAL"`) and stops before creating a half-connected
  row, showing the member a clear "Creator or Business account needed" message.
- `followers_count`, `follows_count`, `media_count` are available on `/me`.
  There is no "likes" or "engagement rate" field on this endpoint — Instagram
  doesn't expose those without the separate Insights API (a different,
  more restricted permission).

### TikTok

- `follower_count`, `following_count`, `likes_count` (lifetime total, not
  per-video) are available. **`video_count` is not** — Display API's
  `user.info.stats` scope doesn't expose it, and the field is simply
  omitted (`postCount: null`) rather than guessed at.
- Per-video performance and engagement rate require TikTok's **Research
  API**, a separate, much more restrictive program generally limited to
  approved academic/research use — not a realistic path for this app.

### YouTube

- `subscriberCount` and `videoCount` come from the standard, stable
  YouTube Data API v3 (`channels?part=snippet,statistics&mine=true`) — no
  App Review gate beyond Google's own OAuth consent screen, though
  `youtube.readonly` is a Google "sensitive" scope, meaning **Google's own
  OAuth verification** (separate from Meta/TikTok review) is required
  before this scope works for anyone beyond manually added test users.
- YouTube has no public "channels I'm following" metric — `followingCount`
  is always `null` by design, not a bug.

### Follower counts and manually-entered data never mix

`syncConnection`/`exchangeAndStoreConnection` only ever write to the
`SocialConnection` table (plus a best-effort `Member.followerCount` rollup
that only ever increases, never overwrites a higher self-reported number
downward). Neither function ever touches `bio`, `location`, `displayName`,
or any other field a member edits by hand.

## What this audit could verify vs. what it couldn't

**Verified:** every request URL, HTTP method, field list, and scope
string against each platform's current official documentation; that
`fetchStats` correctly parses a realistic response shape into the stored
fields (see `tests/unit/social-providers.test.ts`, which mocks `fetch`
with real-shaped Instagram/TikTok/YouTube payloads and asserts the parsed
follower counts); that failures throw rather than silently returning fake
data; that tokens are encrypted at rest (AES-256-GCM, not a no-op).

**Not verified, and can't be from here:** an actual live OAuth round-trip
against a real Instagram or TikTok account. That needs real registered
developer-app credentials, a deployed HTTPS callback URL matching what's
registered with each platform, and a human completing the platform's own
consent screen — none of which exist in this sandboxed environment, and
entering real account credentials on your behalf is outside what this
assistant will do regardless of environment. The recommended path: set
the six `*_CLIENT_ID`/`*_CLIENT_SECRET` env vars in a real deployment,
connect one real test account per platform (the app owner's own, added as
a tester in each developer dashboard), and confirm the follower count
shown on `/profile` matches that account's real public follower count.

## Rate limits (supplement, 2026-08-05 — Automatic Follower Sync feature)

Researched while adding the daily/manual follower-sync + growth-history
feature, to size the batching added to the scheduled sync job
(`scheduled-sync.service.ts`, 5 connections at a time with a 500ms pause
between batches).

- **Instagram (Graph API family, which `graph.instagram.com` follows)** —
  Meta's standard, long-documented Graph API call-count formula caps each
  app+user pair at roughly 200 calls/hour, scaling with the number of
  engaged users. A once-daily sync per connection, plus occasional manual
  "Sync Now" clicks, stays trivially under this regardless of member count.
- **TikTok (`/v2/user/info/`)** — TikTok's public developer docs do not
  publish one fixed numeric rate limit for this endpoint the way Meta does;
  limits are enforced per client and can vary by review tier. Rather than
  assume a number I can't verify, the mitigation here is structural: only
  `CONNECTED` rows are ever synced (never a blanket scan of every member),
  requests are batched and staggered, and the daily cron only runs once —
  the same posture that would stay safe under most reasonable per-app
  limits without depending on a specific published ceiling.
- **YouTube Data API v3** — publishes an explicit daily quota (10,000 units/
  day by default per project; `channels.list` costs 1 unit/call), which a
  once-daily sync per connection uses a negligible fraction of even at
  significant scale.

This app already respects all three by construction (batched, connected-
only, once-daily automatic + rate-limited-by-usage manual), independent of
the exact numbers above — the batching exists so this remains true even if
a platform's limit turns out to be stricter than expected.

## Operational notes for whoever owns the developer-app credentials

- Meta Graph API versions expire ~2 years after release. `v22.0` (bumped
  here) should be revisited well before mid-2027.
- TikTok's Display API has an ongoing "migration plan" mentioned in its
  own docs beyond the Feb 2024 scope split already handled here — worth a
  periodic check against TikTok's changelog.
- If deeper metrics are ever needed (engagement rate, per-post insights),
  that requires each platform's separate, more restrictive
  Insights/Research API — a materially bigger integration, not a small
  addition to what exists today. The `engagementRate` column already added
  to `SocialConnection` is reserved for exactly that future work.
