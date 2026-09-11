-- RLS for creator_library_profiles, following the exact model established in
-- 20260805110000_agency_kiosk_rls for the other "genuinely public,
-- admin-controlled" content tables (kiosk_themes, membership_plans.isActive):
-- enable RLS, then allow anon/authenticated to SELECT only the rows that are
-- actually published (visible = true), plus an admin-org-wide read. No write
-- policies — every write goes through a Prisma server action, and the
-- /creator-library surface itself is gated by its own shared-password cookie
-- (see src/features/creator-library/auth), not the Supabase session.
--
-- As with every other RLS migration here, this is defense-in-depth only:
-- nothing in src/ queries this table via the Supabase Data API. The real
-- authorization boundary is the app-layer check in the library's service
-- functions (visible = true + organization scoping) and the admin permission
-- gate on /admin/creator-library.

ALTER TABLE "public"."creator_library_profiles" ENABLE ROW LEVEL SECURITY;

create policy "anyone can read visible creator library profiles"
on "creator_library_profiles" for select to anon, authenticated
using (visible = true);

create policy "admin can read all org creator library profiles"
on "creator_library_profiles" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());
