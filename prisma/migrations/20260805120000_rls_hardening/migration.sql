-- Hardening pass following the RLS security review of 20260805110000. Four
-- changes, all approved individually, none of which alter any existing
-- authorization outcome for legitimate data:
--   1. rls.belongs_to_agency()/rls.is_agency_admin() gain an explicit
--      organizationId check instead of relying on the (currently-always-true)
--      invariant that Member.agencyId only ever points within the caller's
--      own org.
--   2. PUBLIC's implicit EXECUTE grant (Postgres's default-on-create
--      behavior) is revoked from every rls.* helper; anon/authenticated keep
--      exactly the access they already had.
--   3. Persistent COMMENT ON documentation is attached to rls.is_admin() and
--      the three "public kiosk content" policies, so a future reader doesn't
--      mistake either for something it isn't.
--   4. Six indexes are added to support columns that RLS policies filter on
--      but that had no leading-column index (pure performance, zero
--      behavior change).

-- =============================================================================
-- 4) Indexes for RLS-filtered columns that lacked a leading-column index.
-- Each of these is either a standalone equality filter in a policy's USING
-- clause, or the second column of an existing composite index (which a btree
-- can't serve as an efficient standalone lookup).
-- =============================================================================

-- comments: "member's own comment" branch of its RLS policy.
CREATE INDEX "comments_memberId_idx" ON "comments"("memberId");

-- event_check_ins: "member's own check-in" branch; the existing
-- (eventId, memberId) unique index can't serve a memberId-only lookup.
CREATE INDEX "event_check_ins_memberId_idx" ON "event_check_ins"("memberId");

-- membership_plans: the anon-facing "active plans are public" policy,
-- evaluated on every unauthenticated /apply page view.
CREATE INDEX "membership_plans_isActive_idx" ON "membership_plans"("isActive");

-- project_collaboration_requests: "requester's own row" branch; the existing
-- (projectId, memberId) unique index can't serve a memberId-only lookup.
CREATE INDEX "project_collaboration_requests_memberId_idx" ON "project_collaboration_requests"("memberId");

-- referral_links: "referrer can read own referral links" branch; the
-- existing (organizationId, referrerMemberId) index can't serve a
-- referrerMemberId-only lookup since referrerMemberId isn't its leading column.
CREATE INDEX "referral_links_referrerMemberId_idx" ON "referral_links"("referrerMemberId");

-- reservations: admin org-wide branch of its RLS policy.
CREATE INDEX "reservations_organizationId_idx" ON "reservations"("organizationId");

-- =============================================================================
-- 1) Explicit organizationId check inside the two agency helpers. Previously
-- these only checked that the calling member's own id/agencyId matched the
-- target agencyId, relying on the app-enforced (but not DB-enforced)
-- invariant that Member.agencyId never crosses an organization boundary.
-- This join makes that boundary an explicit, enforced part of the function
-- itself. For every currently-valid row this is a no-op (the target agency
-- row is always already in the caller's own org); it only changes the
-- outcome for a hypothetical future data-integrity bug that set agencyId
-- cross-org, which would now correctly be denied instead of allowed.
-- =============================================================================

create or replace function rls.belongs_to_agency(p_agency_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members caller
    join members agency_root on agency_root.id = p_agency_id
    where caller."authUserId" = auth.uid()
      and caller."deletedAt" is null
      and caller.status = 'ACTIVE'
      and agency_root."organizationId" = caller."organizationId"
      and (caller.id = p_agency_id or caller."agencyId" = p_agency_id)
  );
$$;

create or replace function rls.is_agency_admin(p_agency_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members caller
    join members agency_root on agency_root.id = p_agency_id
    where caller."authUserId" = auth.uid()
      and caller."deletedAt" is null
      and caller.status = 'ACTIVE'
      and agency_root."organizationId" = caller."organizationId"
      and (caller.id = p_agency_id or caller."agencyId" = p_agency_id)
      and caller."agencyRole" in ('OWNER', 'MANAGER')
  );
$$;

-- =============================================================================
-- 2) Revoke PUBLIC's implicit EXECUTE (Postgres grants this automatically on
-- CREATE FUNCTION unless revoked) and re-assert the minimum required grants:
-- anon and authenticated, the only two Postgres roles that ever evaluate an
-- RLS policy referencing these helpers. `postgres` (the function owner and
-- every table's owner) always retains implicit privilege on its own objects
-- regardless of these grants, and is unaffected.
-- =============================================================================

revoke execute on function rls.member_id() from public;
revoke execute on function rls.org_id() from public;
revoke execute on function rls.is_admin() from public;
revoke execute on function rls.can_access_project(uuid) from public;
revoke execute on function rls.belongs_to_agency(uuid) from public;
revoke execute on function rls.is_agency_admin(uuid) from public;

grant execute on function rls.member_id() to anon, authenticated;
grant execute on function rls.org_id() to anon, authenticated;
grant execute on function rls.is_admin() to anon, authenticated;
grant execute on function rls.can_access_project(uuid) to anon, authenticated;
grant execute on function rls.belongs_to_agency(uuid) to anon, authenticated;
grant execute on function rls.is_agency_admin(uuid) to anon, authenticated;

-- =============================================================================
-- 3) Persistent documentation, attached to the catalog objects themselves
-- (queryable via pg_description / obj_description, not just this file).
-- =============================================================================

comment on function rls.is_admin() is
  'Intentionally simplified: true only when systemRole IN (ADMIN, SUPER_ADMIN). Not a mirror of the application hasPermission()/ROLE_PERMISSIONS matrix in src/lib/permissions/index.ts -- MANAGER and PROJECT_LEADER hold several admin-adjacent permissions in the app (members.manage, projects.manage, gmv.manage, etc.) but are deliberately excluded here. This function is only a coarse defense-in-depth backstop for the anon/authenticated Data API path, which the application itself never uses -- every read and write goes through Prisma as the postgres table owner, bypassing RLS entirely. hasPermission() in TypeScript remains the actual authorization boundary; do not assume RLS enforces the same granularity.';

comment on policy "anyone can read published kiosk themes" on "kiosk_themes" is
  'Intentionally global, not organizationId-scoped: kiosk content is public marketing/wayfinding shown on the unauthenticated /kiosk route (see PUBLIC_PATHS in middleware.ts). Safe today because this deployment is single-tenant (one Organization row). If this project is ever used multi-tenant, this policy would need explicit organizationId scoping -- a known, accepted tradeoff, not an oversight.';

comment on policy "anyone can read enabled kiosk sections" on "kiosk_section_configs" is
  'Intentionally global, not organizationId-scoped -- same rationale as the equivalent public policy on kiosk_themes: single-tenant deployment today, kiosk content is meant to be public.';

comment on policy "anyone can read published kiosk announcements" on "kiosk_announcements" is
  'Intentionally global, not organizationId-scoped -- same rationale as the equivalent public policy on kiosk_themes: single-tenant deployment today, kiosk content is meant to be public.';
