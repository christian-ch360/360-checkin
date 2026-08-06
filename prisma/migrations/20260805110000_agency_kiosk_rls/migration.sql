-- Closes the Security Advisor's "RLS disabled in public" findings for the
-- 7 tables added since the last RLS sweep (Agency Team Management + Kiosk
-- Theming), following the exact model established in
-- 20260723210000_least_privilege_rls_policies: enable RLS, then add
-- least-privilege SELECT-only policies using the shared `rls.*` helpers
-- (rls.member_id/org_id/is_admin). No new write policies — every write in
-- this app still goes through a Prisma server action.

ALTER TABLE "public"."agency_access_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."agency_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."agency_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."kiosk_announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."kiosk_interaction_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."kiosk_section_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."kiosk_themes" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Two more `rls` schema helpers, mirroring belongsToAgency()/isAgencyAdmin()
-- in src/features/agencies/services/agency-access.service.ts exactly (a
-- member belongs to an agency team if they ARE the agency's canonical
-- Member row, or their own agencyId points at it; they administer it only
-- with agencyRole OWNER or MANAGER). Same SECURITY DEFINER + dedicated-schema
-- pattern as rls.can_access_project — kept in lockstep with the TS source of
-- truth rather than re-deriving the rule from scratch.
-- =============================================================================

create or replace function rls.belongs_to_agency(p_agency_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where "authUserId" = auth.uid() and "deletedAt" is null and status = 'ACTIVE'
      and (id = p_agency_id or "agencyId" = p_agency_id)
  );
$$;

create or replace function rls.is_agency_admin(p_agency_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where "authUserId" = auth.uid() and "deletedAt" is null and status = 'ACTIVE'
      and (id = p_agency_id or "agencyId" = p_agency_id)
      and "agencyRole" in ('OWNER', 'MANAGER')
  );
$$;

grant execute on function rls.belongs_to_agency(uuid) to anon, authenticated;
grant execute on function rls.is_agency_admin(uuid) to anon, authenticated;

-- =============================================================================
-- AGENCY TEAM MANAGEMENT — join requests are visible to the requester
-- (tracking their own status), the agency's OWNER/MANAGER admins (who
-- review them — matches the `canManageAgency` gate in
-- src/app/(dashboard)/agency/page.tsx), and org admins. Activity feed is
-- visible to the whole team (matches /agency/team's unconditional
-- getAgencyActivity call — Staff can see it, only admins can manage from
-- it), plus org admins.
-- =============================================================================

create policy "requester or agency admin can read request, admin org-wide"
on "agency_access_requests" for select to authenticated
using (
  "requesterId" = rls.member_id()
  or rls.is_agency_admin("agencyId")
  or (rls.is_admin() and "organizationId" = rls.org_id())
);

create policy "agency team member can read activity, admin org-wide"
on "agency_activities" for select to authenticated
using (
  rls.belongs_to_agency("agencyId")
  or (rls.is_admin() and "organizationId" = rls.org_id())
);

-- agency_invitations carries a bare unique `token` column that IS the
-- accept-invite credential (same shape as `invitations` and
-- `project_invitations`, both deliberately left with zero policies in prior
-- migrations). Even though agency admins see these rows in the Pending
-- Invitations Card, that read goes through a Prisma server component, never
-- the Data API — granting a client-facing SELECT policy here would hand out
-- the raw single-use token to anyone the policy matches. No policy is added,
-- matching the established treatment of every other token-bearing table.

-- =============================================================================
-- KIOSK THEMING — the kiosk homepage (/kiosk) is public and unauthenticated
-- by design (PUBLIC_PATHS in middleware). Its content tables get the same
-- "genuinely public, admin-controlled" treatment as membership_plans'
-- isActive policy: only the currently-published/enabled rows are
-- anon-readable, gated on the exact same status/enabled values the app's own
-- kiosk-theme-resolution/kiosk-sections/kiosk-announcements services already
-- filter on. Org admins (Kiosk Manager) can additionally see drafts and
-- archived rows org-wide. Interaction events are internal analytics, never
-- shown on the kiosk itself — admin-only, matching email_logs/activity_logs.
-- =============================================================================

create policy "anyone can read published kiosk themes"
on "kiosk_themes" for select to anon, authenticated
using (status = 'PUBLISHED');

create policy "admin can read all org kiosk themes"
on "kiosk_themes" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());

create policy "anyone can read enabled kiosk sections"
on "kiosk_section_configs" for select to anon, authenticated
using (enabled = true);

create policy "admin can read all org kiosk sections"
on "kiosk_section_configs" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());

create policy "anyone can read published kiosk announcements"
on "kiosk_announcements" for select to anon, authenticated
using (status = 'PUBLISHED');

create policy "admin can read all org kiosk announcements"
on "kiosk_announcements" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());

create policy "admin can read org kiosk interaction events"
on "kiosk_interaction_events" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());
