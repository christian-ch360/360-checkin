-- Least-privilege RLS policies, per table, replacing the blanket
-- "RLS enabled, zero policies" posture from the prior migration.
--
-- Still true and unaffected by anything below: Prisma connects as the
-- `postgres` role, which owns every table here and therefore bypasses RLS
-- entirely (no FORCE ROW LEVEL SECURITY is set anywhere). Everything in this
-- file only governs the `anon` and `authenticated` Postgres roles used by
-- Supabase's auto-generated Data API — the path a leaked anon key or a
-- member's own JWT could reach directly, bypassing this app's server
-- actions. No table here is currently queried by the app that way (verified
-- previously: zero `supabase.*.from()` / `.channel()` calls anywhere in
-- src/), but the policies below express the *correct* access model per
-- table, not just a blanket deny, per the five-tier model:
--   anonymous / authenticated member / organization member / admin / service-role-only
--
-- Every policy is read-only (FOR SELECT). No INSERT/UPDATE/DELETE policy is
-- granted to anon or authenticated anywhere: every write in this app goes
-- through a Prisma server action today, so a self-service write policy
-- would have no real caller to validate it against, and getting one wrong
-- (e.g. letting a member UPDATE their own systemRole) is a real risk for
-- zero benefit. If a genuine client-side write path is ever added, it
-- should get its own narrowly-scoped WITH CHECK policy at that time.

-- =============================================================================
-- Identity helpers — SECURITY DEFINER so they can read `members` themselves
-- without recursing through members' own RLS policy, matching Supabase's
-- documented pattern for this exact situation. Kept in a dedicated schema
-- (not `public`) so they're never exposed as PostgREST RPC endpoints —
-- they're only callable from inside a policy expression.
--
-- Each helper is gated on status = 'ACTIVE': a PENDING, SUSPENDED, REJECTED,
-- or INACTIVE member's session resolves to no identity at all, so every
-- policy below fails closed for them automatically, without repeating the
-- status check table by table.
-- =============================================================================

create schema if not exists rls;
grant usage on schema rls to anon, authenticated;

create or replace function rls.member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from members
  where "authUserId" = auth.uid() and "deletedAt" is null and status = 'ACTIVE'
  limit 1;
$$;

create or replace function rls.org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select "organizationId" from members
  where "authUserId" = auth.uid() and "deletedAt" is null and status = 'ACTIVE'
  limit 1;
$$;

create or replace function rls.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select "systemRole" in ('ADMIN', 'SUPER_ADMIN') from members
     where "authUserId" = auth.uid() and "deletedAt" is null and status = 'ACTIVE'),
    false
  );
$$;

-- Shared by tasks/notes/comments/files: true when the caller leads the
-- project, is assigned to it, or is an org admin.
create or replace function rls.can_access_project(p_project_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from projects p
    where p.id = p_project_id
      and (
        (rls.is_admin() and p."organizationId" = rls.org_id())
        or p."projectLeaderId" = rls.member_id()
        or exists (
          select 1 from project_assignments pa
          where pa."projectId" = p.id and pa."memberId" = rls.member_id()
        )
      )
  );
$$;

grant execute on function rls.member_id() to anon, authenticated;
grant execute on function rls.org_id() to anon, authenticated;
grant execute on function rls.is_admin() to anon, authenticated;
grant execute on function rls.can_access_project(uuid) to anon, authenticated;

-- =============================================================================
-- CORE / ORGANIZATION — organization member (read own org only)
-- =============================================================================

create policy "org member can read own organization"
on "organizations" for select to authenticated
using (id = rls.org_id());

-- =============================================================================
-- MEMBERS — self (own row) + admin (org-wide). No client write policy: every
-- write (including admin edits and self-service profile updates) goes
-- through updateOwnProfile/createMember server actions today.
-- =============================================================================

create policy "member can read own row, admin can read org members"
on "members" for select to authenticated
using (
  "authUserId" = auth.uid()
  or (rls.is_admin() and "organizationId" = rls.org_id())
);

-- Admin-only, and explicitly never visible to the member it's about — same
-- intent as the model's own comment in schema.prisma.
create policy "admin can read member notes in their org"
on "member_notes" for select to authenticated
using (
  rls.is_admin()
  and exists (
    select 1 from members m
    where m.id = "member_notes"."memberId" and m."organizationId" = rls.org_id()
  )
);

-- =============================================================================
-- COMPANIES & BRANDS — organization directory data, any org member can browse
-- =============================================================================

create policy "org member can read companies"
on "companies" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "org member can read brands"
on "brands" for select to authenticated
using ("organizationId" = rls.org_id());

-- =============================================================================
-- PROJECTS — visible to the project's leader/assignees, and to org admins;
-- budget/GMV/commissionPool are sensitive enough that ordinary org members
-- shouldn't see every project, only ones they're actually on.
-- =============================================================================

create policy "project leader, assignee, or admin can read project"
on "projects" for select to authenticated
using (
  (rls.is_admin() and "organizationId" = rls.org_id())
  or "projectLeaderId" = rls.member_id()
  or exists (
    select 1 from project_assignments pa
    where pa."projectId" = "projects".id and pa."memberId" = rls.member_id()
  )
);

create policy "project members and admin can read assignments"
on "project_assignments" for select to authenticated
using (rls.can_access_project("projectId"));

create policy "project members and admin can read tasks"
on "tasks" for select to authenticated
using (rls.can_access_project("projectId"));

create policy "project members and admin can read notes"
on "notes" for select to authenticated
using (rls.can_access_project("projectId"));

create policy "project members, author, and admin can read comments"
on "comments" for select to authenticated
using (
  "memberId" = rls.member_id()
  or ("projectId" is not null and rls.can_access_project("projectId"))
);

-- =============================================================================
-- FACILITY CHECK-IN — a member's own attendance history, plus org admins
-- =============================================================================

create policy "member can read own check-ins, admin can read org check-ins"
on "check_ins" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "check_ins"."memberId" and m."organizationId" = rls.org_id())
  )
);

-- =============================================================================
-- BOOTHS & ROOMS — spaces are org directory data (browse to book); reservation
-- and session rows stay scoped to the member(s) actually involved
-- =============================================================================

create policy "org member can read spaces"
on "spaces" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "owner, attendee, or admin can read reservation"
on "reservations" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (rls.is_admin() and "organizationId" = rls.org_id())
  or exists (
    select 1 from "_ReservationAttendees" ra
    where ra."B" = "reservations".id and ra."A" = rls.member_id()
  )
);

create policy "member, attendee (via reservation), or admin can read attendee links"
on "_ReservationAttendees" for select to authenticated
using (
  "A" = rls.member_id()
  or exists (
    select 1 from reservations r
    where r.id = "_ReservationAttendees"."B"
      and (r."memberId" = rls.member_id() or (rls.is_admin() and r."organizationId" = rls.org_id()))
  )
);

create policy "member can read own space sessions, admin can read org sessions"
on "space_sessions" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from spaces s where s.id = "space_sessions"."spaceId" and s."organizationId" = rls.org_id())
  )
);

-- =============================================================================
-- COMMISSION ENGINE — tier definitions are org reference data (a member
-- should be able to see what their own tier means); individual transactions
-- and payouts are financial data scoped to the member they belong to
-- =============================================================================

create policy "org member can read commission tiers"
on "commission_tiers" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "member can read own commission transactions, admin org-wide"
on "commission_transactions" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "commission_transactions"."memberId" and m."organizationId" = rls.org_id())
  )
);

create policy "member can read own payouts, admin org-wide"
on "payouts" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "payouts"."memberId" and m."organizationId" = rls.org_id())
  )
);

-- =============================================================================
-- GMV — a member's own earned transactions, plus org admins
-- =============================================================================

create policy "member can read own GMV transactions, admin org-wide"
on "gmv_transactions" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "gmv_transactions"."memberId" and m."organizationId" = rls.org_id())
  )
);

-- =============================================================================
-- QR SYSTEM / INVITATIONS — service role only. Both tables carry a bare
-- `token` column that IS the credential (a QR badge token doubles as a
-- check-in credential; an invitation token is a single-use signup link).
-- Even self-access is deliberately withheld: a member's own QR image is
-- already served through a signed, Prisma-mediated route
-- (/api/qr/[token]), never fetched by the client directly from the table.
-- No policy is added — see the summary for why this is intentional.
-- =============================================================================

-- =============================================================================
-- LOGGING / AUDIT — operational/compliance data, admin-only. Not personal
-- "my activity" data (that's check_ins/scan_events, already self-scoped
-- above); these are org-wide operational logs.
-- =============================================================================

create policy "admin can read org activity log"
on "activity_logs" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());

create policy "admin can read org audit log"
on "audit_logs" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());

-- Private inbox — strictly self, not even admins get a blanket read.
create policy "member can read own notifications"
on "notifications" for select to authenticated
using ("memberId" = rls.member_id());

create policy "project members and admin can read files, org admin for non-project files"
on "files" for select to authenticated
using (
  ("projectId" is not null and rls.can_access_project("projectId"))
  or ("projectId" is null and rls.is_admin() and "organizationId" = rls.org_id())
);

create policy "member can read own feedback, admin org-wide"
on "feedback" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (rls.is_admin() and "organizationId" = rls.org_id())
);

-- =============================================================================
-- COLLAB HUB MARKETPLACE — posts are a browsable org directory; applications,
-- conversations, and messages stay scoped to the members actually involved
-- =============================================================================

create policy "org member can read collab posts"
on "collab_posts" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "applicant, post owner, or admin can read collab application"
on "collab_applications" for select to authenticated
using (
  "applicantId" = rls.member_id()
  or exists (
    select 1 from collab_posts cp
    where cp.id = "collab_applications"."collabPostId"
      and (cp."memberId" = rls.member_id() or (rls.is_admin() and cp."organizationId" = rls.org_id()))
  )
);

create policy "poster or initiator can read collab conversation"
on "collab_conversations" for select to authenticated
using ("posterId" = rls.member_id() or "initiatorId" = rls.member_id());

create policy "conversation participant can read collab messages"
on "collab_messages" for select to authenticated
using (
  exists (
    select 1 from collab_conversations c
    where c.id = "collab_messages"."conversationId"
      and (c."posterId" = rls.member_id() or c."initiatorId" = rls.member_id())
  )
);

-- =============================================================================
-- DIRECT MESSAGING — participant-only, matching Collab Hub messaging above
-- =============================================================================

create policy "participant can read own direct conversations"
on "direct_conversations" for select to authenticated
using (
  exists (
    select 1 from direct_conversation_participants p
    where p."conversationId" = "direct_conversations".id and p."memberId" = rls.member_id()
  )
);

create policy "participant can read conversation's participant list"
on "direct_conversation_participants" for select to authenticated
using (
  "memberId" = rls.member_id()
  or exists (
    select 1 from direct_conversation_participants p2
    where p2."conversationId" = "direct_conversation_participants"."conversationId" and p2."memberId" = rls.member_id()
  )
);

create policy "participant can read direct messages"
on "direct_messages" for select to authenticated
using (
  exists (
    select 1 from direct_conversation_participants p
    where p."conversationId" = "direct_messages"."conversationId" and p."memberId" = rls.member_id()
  )
);

-- =============================================================================
-- KIOSK / VISITORS — front-desk/operational data, admin-only. Locations are
-- org reference data (used by check-in/occupancy views), any org member.
-- =============================================================================

create policy "admin can read org visitors"
on "visitors" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());

create policy "org member can read locations"
on "locations" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "member can read own scan events, admin org-wide"
on "scan_events" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and (
      "locationId" is null
      or exists (select 1 from locations l where l.id = "scan_events"."locationId" and l."organizationId" = rls.org_id())
    )
  )
);

-- =============================================================================
-- EMAIL — delivery/audit log, admin-only (Admin Communications Center)
-- =============================================================================

create policy "admin can read org email logs"
on "email_logs" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());

-- =============================================================================
-- MEMBERSHIP APPLICATIONS — admin-review queue. The public /apply form that
-- creates these rows submits through a Prisma server action (applicant is
-- never authenticated, never touches the Data API), so no anon INSERT
-- policy is needed despite the form itself being public-facing.
-- =============================================================================

create policy "admin can read org membership applications"
on "membership_applications" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());

-- =============================================================================
-- EVENTS — org directory data (browse to RSVP); RSVP rows scoped to the
-- member who made them, plus org admins
-- =============================================================================

create policy "org member can read events"
on "events" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "member can read own rsvp, admin org-wide"
on "event_rsvps" for select to authenticated
using (
  "memberId" = rls.member_id()
  or exists (
    select 1 from events e
    where e.id = "event_rsvps"."eventId" and rls.is_admin() and e."organizationId" = rls.org_id()
  )
);

-- =============================================================================
-- MEMBERSHIP PLANS — genuinely public pricing/marketing content (shown on
-- the public /apply page): active plans are anon-readable. Org members see
-- the full org catalog including inactive plans (e.g. their own legacy
-- plan). Subscriptions and payments are private financial data, self +
-- admin only.
-- =============================================================================

create policy "anyone can read active membership plans"
on "membership_plans" for select to anon, authenticated
using ("isActive" = true);

create policy "org member can read all org membership plans"
on "membership_plans" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "member can read own subscription, admin org-wide"
on "member_subscriptions" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "member_subscriptions"."memberId" and m."organizationId" = rls.org_id())
  )
);

create policy "member can read own payments, admin org-wide"
on "membership_payments" for select to authenticated
using (
  exists (
    select 1 from member_subscriptions ms
    where ms.id = "membership_payments"."memberSubscriptionId"
      and (
        ms."memberId" = rls.member_id()
        or (rls.is_admin() and exists (select 1 from members m where m.id = ms."memberId" and m."organizationId" = rls.org_id()))
      )
  )
);

-- =============================================================================
-- SOCIAL CONNECTIONS — a member's own connected platforms (Settings/Profile),
-- plus org admins (Platform Integrations panel). accessTokenEnc/
-- refreshTokenEnc are encrypted at rest; RLS is row-level, not column-level,
-- so this grants row visibility, not plaintext token exposure — the
-- decryption key never leaves the app server.
-- =============================================================================

create policy "member can read own social connections, admin org-wide"
on "social_connections" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "social_connections"."memberId" and m."organizationId" = rls.org_id())
  )
);

-- =============================================================================
-- _prisma_migrations — service role only, no policy. Internal Prisma
-- bookkeeping (migration names/checksums), no client relevance at all.
-- =============================================================================
