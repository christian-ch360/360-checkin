# CreatorHub360 Architecture

This document orients a new developer to how the CreatorHub360 operating system is put
together: what each subsystem does, where its code lives, and — most importantly — what
*not* to change casually. It complements (does not replace) the in-code comments, which
carry the actual reasoning for specific decisions; this file is the map, not the territory.

Written from direct inspection of the codebase as of this pass. Where a section describes
something this pass did not personally exercise end-to-end, that's noted rather than implied.

---

## 1. System overview

CreatorHub360 is a single Next.js 15 (App Router) application serving as the internal
operating system for a creator-economy campus: member/creator management, applications and
onboarding, physical space bookings and check-in, projects and GMV/commission attribution,
agency and brand relationships, a community feed, direct messaging, a public kiosk, and the
email/notification systems that tie it together.

- **One codebase, one deploy.** There is no separate backend service — Server Components,
  Server Actions, and a handful of Route Handlers (`src/app/api/**`) are the entire backend.
- **One database.** Supabase Postgres, accessed almost exclusively through Prisma. Supabase
  Auth provides identity; Supabase Storage holds uploaded images/assets.
- **Multi-tenant by `organizationId`.** Nearly every model carries an `organizationId` column.
  Today there is effectively one live organization, but the schema and every query already
  assume more than one could exist — never write a query that omits the org scope on the
  assumption "there's only one anyway."

## 2. Application structure

```
src/
  app/                Next.js routes. Route groups: (auth), (dashboard). Also: kiosk/, api/,
                       apply/, scan/, login/, legal/, agency-invite/, brand-invite/.
  features/<domain>/  Feature modules — the real unit of organization in this codebase.
    components/       UI (Server or Client Components, colocated)
    services/         Data access + Server Actions ("use server"), often "server-only"
    schemas/           Zod validation shared by forms and actions
    config/            Static config/catalogs for that feature
  components/ui/       shadcn/ui primitives (generated; edit sparingly, see components.json)
  components/layout/   App shell: sidebar, topbar, command palette, notifications/messages menus
  components/shared/   Cross-feature presentational components
  lib/                 Supabase clients, Prisma client, permissions, email, formatting, utils
  stores/               Zustand stores (client UI state only — data itself lives in RSC/DB)
  config/               Navigation (nav.ts)
  emails/                React Email templates, rendered server-side for both transactional
                          and marketing sends
prisma/
  schema.prisma         The data model (85 models as of this pass)
  migrations/            Hand-written SQL migrations (see §28) — never edited after landing
  seed.ts, create-founder.ts, seed-*.ts, backfill-*.ts
                          One-time/setup scripts, run via `tsx`, not part of the running app
tests/
  unit/, integration/    Vitest
```

**Feature-module convention**: a feature's `services/*.actions.ts` files are the only
sanctioned way to mutate data from the UI. A component should not call Prisma directly, and
should not call another feature's service internals — go through that feature's exported
service/action functions. This isn't enforced by tooling, only by convention; respect it when
adding code.

## 3. Authentication architecture

Identity is Supabase Auth (email/password, plus Google/Apple OAuth per `/login`). The bridge
from "a Supabase user is signed in" to "who is this in our data model" is
`src/features/auth/services/current-member.ts`:

- `getCurrentMember()` — resolves the Supabase session to a `Member` row (by `authUserId`),
  `cache()`-wrapped so it's fetched once per request regardless of how many components ask.
  Deliberately includes only `commissionTier` and `subscription` — every other relation was
  audited out because this function runs on nearly every request.
- `requireCurrentMember()` — same, but throws if unauthenticated. Every gated Server
  Action/page starts by calling this.

`middleware.ts` calls `updateSession()` (`src/lib/supabase/middleware.ts`) on every request
(matcher excludes static assets) to refresh the Supabase session cookie — this is what keeps
a signed-in session alive across navigations. It also opportunistically sets a first-party
referral cookie when someone lands on `/apply?ref=...`.

**Do not change:** the middleware matcher (breaking it can silently stop session refresh
sitewide), or `getCurrentMember`'s minimal `include` (re-adding unused relations there is a
sitewide N+1/latency regression, not a local one).

## 4. Authorization architecture

Two layers, deliberately redundant (defense in depth — see §27 for why this matters):

1. **Application-layer, primary.** Every Server Action/route handler that mutates or reads
   sensitive data calls `requireCurrentMember()` then checks `hasPermission(actor.systemRole,
   "<permission>")` (see §5) and/or filters by `actor.organizationId`. This is the actual
   authorization boundary in this app — Prisma runs as a privileged Postgres role and does
   not go through RLS at all (see §27).
2. **Database-layer, defense in depth.** RLS policies exist per-table for the `anon` and
   `authenticated` Postgres roles — the identities Supabase's auto-generated Data API would
   use if something ever queried Supabase directly from the client. As of this pass, nothing
   in `src/` does that (verified: no `supabase.*.from()`/`.channel()` calls) — RLS is
   insurance against a future/accidental client-side query or a leaked anon key, not the
   thing currently protecting data.

## 5. Business Role vs. System Role

Two independent axes, easy to confuse, never the same field:

- **`Member.role` (`MemberRole`)** — the *business* relationship: `CREATOR`, `AGENCY`,
  `BRAND`, `BROKER`, `BUSINESS_DEVELOPMENT`, `VENDOR`, `STAFF`, `ENTERTAINMENT`, `INVESTOR`,
  `PROJECT_LEADER`. Drives what a member *is* in the product (creator dashboard vs. agency
  roster vs. brand portal, etc.) — not what they're allowed to do administratively.
- **`Member.systemRole` (`SystemRole`)** — the *administrative* level: `SUPER_ADMIN`,
  `ADMIN`, `MANAGER`, `PROJECT_LEADER`, `MEMBER`, `GUEST`. This is what `hasPermission()`
  (`src/lib/permissions/index.ts`) checks. A `CREATOR` (business role) can simultaneously be
  a `SUPER_ADMIN` (system role) — the two are set independently.
- A third, narrower axis exists only inside the agency feature: **`AgencyMemberRole`**
  (`OWNER`/`ADMIN`/`MANAGER`/`STAFF`) — an agency's own internal team hierarchy, unrelated to
  `SystemRole` and only meaningful when `Member.agencyId` is set (see §23).

`ALL_PERMISSIONS` in `src/lib/permissions/index.ts` is the single source of truth for what a
permission string can be; `ROLE_PERMISSIONS` maps each `SystemRole` to its granted set.
`SUPER_ADMIN` is spread from `[...ALL_PERMISSIONS]` rather than hand-listed, specifically so a
newly-added permission is automatically granted to Super Admin without a second edit.

## 6. Super Admin permissions

`SUPER_ADMIN` holds every permission by construction (§5). In practice this means: full admin
dashboard access, kiosk theme management, legal document publishing, commission/billing
overrides, agency merges, community moderation, and every other `*.manage`/`*.access`
permission. There is no permission a Super Admin lacks — don't add a new gated feature and
forget it's automatically included.

## 7. Membership architecture

`Member` (85-model schema's largest/most-connected model) is the core identity row — one per
person, one per organization they belong to. Key fields beyond role/systemRole: `status`
(`MembershipStatus`; RLS's `rls.member_id()`/`rls.org_id()` helpers only resolve for
`ACTIVE`), `memberNumber` (see §8 — generated from a real Postgres sequence, not
`count()+1`, specifically to survive historical deletions without colliding), `deletedAt`
(soft delete), `authUserId` (nullable — a member can exist before they have a Supabase
account, e.g. a pending application not yet approved).

## 8. Application approval flow

Public applications (`/apply`, and the kiosk's own apply form) write a `MembershipApplication`
row via `submitApplicationAction` (`src/features/applications/services/actions.ts`) —
deliberately **never** creates a `Member`, Supabase user, or QR asset at submission time; only
after an admin approves does `application_approved` provision the real account (temp
password, QR, welcome email). This keeps the public, unauthenticated surface from ever writing
to the tables that matter for access control. Rejection/duplicate-detection logic lives
alongside it (`AgencyDuplicateError`, `EmailConflictError` — both checked *before* insert so
the applicant gets a same-request error, not a stuck row).

## 9. Social integration architecture

**See `docs/SOCIAL_INTEGRATIONS.md` for the authoritative, API-verified writeup** (endpoints,
scopes, known platform limitations, and a real bug that was found and fixed in TikTok's OAuth
scope). Summary of what's here in `src/features/integrations/`:

- `config/providers.ts` — per-platform config: OAuth URLs, scopes, `fetchStats()`. This is
  the *only* place that calls Instagram/TikTok/YouTube APIs — every follower count on a
  profile traces back to a real `fetch()` here, not mock data.
- `services/social-connections.service.ts` — `SocialConnection` CRUD, one row per
  member-per-platform, holds the OAuth tokens.
- `services/token-refresh.service.ts` — refresh-before-expiry logic (platforms differ: some
  tokens don't expire at all, see docs above).
- `services/scheduled-sync.service.ts` — see §13.
- `services/follower-growth.service.ts` — see §14.

**Do not add Shopify or Shopline functionality beyond what exists** (Shopify is real, live,
current product functionality — `config/store-providers.ts`, `StoreProvider` enum, reachable
from Profile → Integrations; Shopline does not exist anywhere in this codebase and per
product direction should not be added). **Do not add Apple/Google Wallet functionality** —
none exists today.

## 10–12. Instagram / TikTok / YouTube integration

Each is one entry in `PROVIDERS` (`config/providers.ts`) implementing the same shape:
`buildAuthorizeUrl`, `exchangeCode`, `fetchStats`. See `docs/SOCIAL_INTEGRATIONS.md` for the
platform-specific scope requirements and App Review gating — both Instagram and TikTok
require the platform owner to complete developer app review before real (non-tester) members
can connect; this is a platform requirement, not a bug in this codebase.

## 13. Daily social synchronization

`src/app/api/cron/sync-integrations/route.ts` → `runScheduledSync()`
(`services/scheduled-sync.service.ts`). Triggered by Vercel Cron (see `vercel.json`'s
`crons` array), authenticated via `Authorization: Bearer $CRON_SECRET` — Vercel's documented
mechanism, not a bespoke scheme. Refreshes stale tokens, re-fetches stats for every connected
account, and (see §14) writes a follower-history point per sync.

## 14. Follower history

Each sync writes a timestamped snapshot (not just overwriting the latest count) specifically
so growth-over-time charts (`follower-growth.service.ts`, `social-sparkline.tsx`) have real
data rather than an interpolated line between two points.

## 15. Kiosk architecture

The public, unauthenticated `/kiosk` route (`src/app/kiosk/`) is a standalone experience
sharing the rest of the app's Prisma layer and design tokens, but not its auth. Top-down:

- **`KioskChrome`** (`src/features/kiosk/components/kiosk-chrome.tsx`) — the fixed,
  full-viewport shell. Establishes `container-type: inline-size` so the Hero's fluid
  typography (§16) has a real width to scale against — this is *why* it must stay a
  `container`-establishing element; removing that breaks type scaling on both the live kiosk
  and the Theme Editor preview (they intentionally share this exact component).
- **`KioskBackground`** — the plain white/near-white fallback, always present beneath
  whatever theme is active.
- **`KioskThemeBackground`** — the *active theme's* background: an image/video
  (`object-cover` by default, or `object-contain` when `backgroundContain` is set — see §16)
  or a color gradient, plus an optional dark overlay wash and decorative effects layer.
- **`KioskHero`** — headline/kioskTitle/subheadline hierarchy, date/time, promo pill, CTA.
  Reads every visual property from the resolved theme; contains no hardcoded per-event copy.
- **`KioskDecorativeLayer`** — renders whichever `KioskDecorativeElement`s the theme selected
  (confetti, fireworks, light rays, sparkles, bokeh, snowfall, etc. — see
  `kiosk-decorative-elements.config.ts` for the full closed catalog and what CSS/motion each
  one maps to).
- **`KioskApp`** — the actual state machine: home → scanning → success/error, or
  home → apply-form → apply-success. Owns the QR scan dispatch and the offline-queue retry
  (a scan made while offline is queued and replayed once connectivity returns).

**The live kiosk and the Theme Editor's live preview render the same production component
tree** (`KioskChrome` → `KioskApp`), the editor just wraps it in `KioskPreviewProvider` to
simulate a chosen date/time and short-circuit the real check-in/registration handlers. This is
deliberate — it's what guarantees "what you see in the editor is what ships," and should not
be forked into a separate preview-only renderer.

## 16. Theme system

`KioskTheme` (Prisma model) is versioned: every edit to a `PUBLISHED` theme creates a new
`DRAFT` row under the same `themeKey` rather than mutating history; `version` + `status`
together determine what's editable vs. live. **Which theme is actually showing right now is
never stored** — `resolveActiveTheme()` (`kiosk-theme-resolution.service.ts`) computes it at
read time from whichever `PUBLISHED` themes exist, in this precedence: a manually
`isPinnedLive` theme wins outright; otherwise the highest-`priority` theme whose schedule
window (`isThemeScheduledNow()`, `kiosk-schedule.ts`) currently matches; otherwise the org's
`isDefault` theme. A stored "is live" boolean would drift the instant the clock crosses a
schedule boundary with nobody watching — this is why it's computed, not cached.

Two per-theme fields exist specifically as narrow, additive opt-outs/opt-ins so new themes
can look different without touching how any *existing* theme renders:
- `backgroundOverlay` (default `true`) — opts a theme *out* of the dark gradient wash normally
  laid over a background image (for a background that's meant to be light/primary, not a
  dimmed photo backdrop).
- `backgroundContain` (default `false`) — opts a theme *into* `object-contain` instead of the
  default `object-cover`, for a deliberately-composed poster image (meaningful content at the
  edges) that must never be cropped.

Both default to the pre-existing behavior, so no theme created before either field existed
changed appearance when the field was added.

## 17. Theme editor

`src/features/kiosk/components/admin/theme-editor/` — one long form (`kiosk-theme-editor.tsx`
owns `FormState`) with sectioned panels (Basic Info, Branding, Colors, Scheduling, Effects,
Sponsors, History). `theme-editor-preview-panel.tsx` renders the real `KioskApp` (§15) at a
chosen device size, with a "Preview as Live" date/time simulator that reuses the exact same
`isThemeScheduledNow()` predicate the live kiosk uses — so "would this be live right now" in
the editor can never disagree with the real resolver.

## 18. Event system

`Event` model + `src/features/events/`. Proposal → admin approval/rejection/changes-requested
→ published workflow; `EventRegistration` for RSVPs. A `KioskTheme` can link to an `Event`
(`eventId`) instead of duplicating title/description/date — when linked, the theme's display
content is read live from the Event (see `resolveScheduleAndContent` in
`kiosk-theme-resolution.service.ts`), so editing the Event keeps the kiosk in sync without a
second edit.

## 19. QR / check-in architecture

`src/features/qr/` (token generation/signing, asset — the actual PNG — generation) +
`src/features/checkin/` (the check-in/out mutation itself) +
`src/features/kiosk/services/kiosk-scan-dispatcher.ts` (routes a raw scanned string to the
right handler: member check-in, event check-in, visitor, etc.). `qr-scanner.tsx` wraps the
`html5-qrcode` camera library with a small state machine (`idle → starting → scanning`) to
prevent double-starts against the camera. **QR-only check-in is deliberate product policy —
do not add an email/phone lookup fallback to the kiosk check-in flow.**

## 20. Spaces

`src/features/spaces/` — physical space/room booking (`Space`, reservations), feeds the
Reservation confirmation/reminder/cancellation email set (§26) and the front-desk visitor
flow (`src/features/visitors/`).

## 21. Projects

`src/features/projects/` — the unit that GMV and commissions (§22) attribute against; also
the thing Collab Hub/Community collaboration requests ultimately create/join.

## 22. GMV / commissions

`src/features/gmv/services/gmv.service.ts` — GMV recording and aggregation, filterable by
`projectId` and (as of the Sept 2026 agency-CRM extension work) `campaignId`.
`src/features/commissions/services/commission-engine.ts` — computes commission from GMV +
a member's `commissionTier`. Treat both as security/finance-adjacent: they feed real payout
numbers, so changes here need the same conservatism as auth code, not just "does it compile."

## 23. Agency architecture

`src/features/agencies/` (55 files) is one of the largest feature modules — agency
claim/team-management, referral-code-based creator attribution, and (per the most recent
extension) a fuller CRM layer (campaigns, contracts with DocuSign e-signature, invoices,
files, brand-contact portal). An agency's *team* uses `AgencyMemberRole` (§5) —
`OWNER > ADMIN > MANAGER > STAFF` — checked via `src/features/agencies/config/
agency-permissions.ts`'s pure functions, not `hasPermission()`/`SystemRole` (a Manager at an
agency has nothing to do with the org-wide `MANAGER` `SystemRole`). A creator connects to an
agency via `Member.agencyId` (self-relation) using the agency's `referralCode` — this is also
how GMV/commission attribution traces a sale back to the referring agency.

## 24. Notifications

`src/lib/notifications.ts` — `createNotification`/`notifyMembers`, the one path every feature
(community, messaging, agency activity, applications, events) uses to write an in-app
`Notification` row; most `NotificationType`s also fire a matching transactional email through
the same `EmailService` choke point described in §26. The topbar's `notifications-menu.tsx`
polls for new ones via a recursive `setTimeout` (documented in-file: chosen over `setInterval`
so the next poll is only scheduled once the previous request actually finishes, avoiding pile-up
if a request is slow) — the topbar's separate `messages-menu.tsx` unread-count polls independently
on a plain `setInterval`. These are two different pieces of UI polling two different endpoints,
not a duplicate of the same mechanism; unifying them into one shared hook would be a reasonable
future refactor but wasn't done here per "don't refactor working systems" during this pass.

## 25. Messaging / community

`src/features/messaging/` — 1:1 and group direct messages, typing/read-receipts.
`src/features/community/` + `src/features/collab-hub/` — the general social feed
(posts/reactions/comments/hashtags/mentions) and the paid/trade creator marketplace,
respectively; these are two genuinely different concepts that happen to share some
UI patterns (both were, at one point, both reachable at similar-sounding nav labels — nav.ts
disambiguates them today as "Community" (`/community`) vs. the marketplace at `/collab-hub`'s
successor routes under `/community/collabs`).

## 26. Legal acceptance

`src/features/legal/` — versioned legal documents (`LegalDocumentVersion`), per-member
acceptance tracking (`LegalAcceptance`), and a re-accept flow (`/legal/reaccept`) triggered
sitewide when an admin publishes a new major version. Both `legal_document_versions` and
`legal_acceptances` have their own RLS migrations (§4/§27) — legal acceptance is exactly the
kind of record where "prove this specific member accepted this specific version" matters even
under a hypothetical direct-DB-access scenario, which is why it got its own policy pass rather
than relying on the blanket least-privilege migration alone.

**Email**: every transactional and marketing email funnels through
`sendTemplatedEmail()` (`src/lib/email/email-service.ts`) — the one place that renders a
template, writes an `EmailLog` row, calls Resend with retry, and updates that same row with
the outcome. No feature calls Resend or renders a template directly. `EmailService`'s exported
methods (e.g. `sendWelcomeEmail`, `sendReservationConfirmation`) are the sanctioned entry
points; templates live in `src/emails/templates/`, keyed by name in `email-types.ts`.

## 27. Supabase / RLS architecture

Prisma connects to Postgres as the `postgres` role, which **owns every table and therefore
bypasses RLS entirely** (no table has `FORCE ROW LEVEL SECURITY`). Every RLS policy in this
repo governs only the `anon`/`authenticated` Postgres roles Supabase's auto-generated Data API
would use — the path a leaked anon key or a member's own JWT could reach *directly*,
bypassing this app's Server Actions. As of this pass nothing in `src/` queries Supabase that
way (verified: no `supabase.*.from()`/`.channel()` calls anywhere) — RLS here is insurance
against a future or accidental client-side query, not the mechanism currently protecting data;
**application-layer checks (`requireCurrentMember()` + `hasPermission()` + `organizationId`
filtering) are the real authorization boundary, and RLS policies must never be treated as a
substitute for them when writing a new Server Action.**

Identity inside a policy expression is resolved via two `SECURITY DEFINER` helper functions in
a dedicated `rls` schema (not `public`, so they're never exposed as PostgREST RPC endpoints):
`rls.member_id()` and `rls.org_id()`, both gated on `status = 'ACTIVE'` so a
pending/suspended/rejected/inactive member's session resolves to no identity at all — every
policy fails closed for them automatically. Every existing policy is `FOR SELECT` only; no
table grants `anon`/`authenticated` INSERT/UPDATE/DELETE anywhere, because every real write in
this app goes through a Server Action already — a self-service write policy would have no
real caller to validate against, and getting one wrong is a live risk for zero present benefit.

## 28. Database architecture

Prisma schema (`prisma/schema.prisma`) is the single source of truth for the shape of the
data; migrations (`prisma/migrations/`) are the immutable history of how it got there —
**never edit a migration after it has landed**, including ones the current schema no longer
obviously needs (a migration is a record of what actually ran against production, not
disposable scaffolding). New RLS policies are added as their own hand-written migration
following the existing `*_rls`/`*_rls_hardening` naming and structure (§27), applied with
`prisma migrate deploy` (no shadow database in this workflow) then `prisma generate`.

## 29. Cron / background jobs

Five Vercel Cron routes under `src/app/api/cron/`, each authenticated the same way as §13
(`Authorization: Bearer $CRON_SECRET`, matched against `vercel.json`'s `crons` schedule):
`sync-integrations` (§13), `event-reminders`, `subscription-lifecycle`,
`daily-admin-summary`, `reservation-reminders`. There is no other background-job
infrastructure in this app (no queue, no worker process) — anything that needs to run on a
schedule is one of these five routes or nothing.

## 30. Deployment architecture

Vercel, deploying this single Next.js app. `vercel.json` carries the `crons` schedule (§29).
Supabase (Postgres + Auth + Storage) is the one external stateful dependency; Resend sends
email; Stripe is integrated for billing (`src/features/membership-plans/`,
`payment_failed`/`subscription_renewal` email types). Environment variables are documented in
`.env.example`/`.env.production.example` — treat any variable actually read by
`process.env.X` in `src/` as load-bearing even if this document doesn't name it individually.

---

## What developers should not change casually (cross-cutting)

- `getCurrentMember()`'s `include` (§3) — audited to the minimum every request needs.
- The RLS helper functions and their `status = 'ACTIVE'` gate (§27) — changing the gate
  changes who a policy resolves an identity for, sitewide, silently.
- `sendTemplatedEmail()` as the sole email choke point (§26) — bypassing it means that send
  won't get an `EmailLog` row, retry, or failure alerting.
- `resolveActiveTheme()`'s precedence order (§16) — pinned > scheduled-by-priority > default.
- The shared `KioskChrome`/`KioskApp` tree being reused by both the live kiosk and the Theme
  Editor preview (§15) — forking a separate preview renderer reintroduces the exact
  "editor doesn't match reality" bug class this architecture avoids.
- Migration files, once landed (§28) — edit forward with a new migration, never in place.
- `ALL_PERMISSIONS`/`ROLE_PERMISSIONS` (§5) as the sole permission source of truth — a new
  gated feature should add a permission here, not invent an ad hoc role check elsewhere.
