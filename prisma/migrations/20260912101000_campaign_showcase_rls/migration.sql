-- RLS for campaign_showcases — same "genuinely public, admin-controlled
-- content" pattern as creator_library_profiles (20260910120500): anyone
-- (anon/authenticated) may SELECT only published rows, plus an admin-org-
-- wide read. Defense-in-depth only — the actual /creator-library "Our Work"
-- page reads through a Prisma server component, not the Supabase Data API.

ALTER TABLE "public"."campaign_showcases" ENABLE ROW LEVEL SECURITY;

create policy "anyone can read published campaign showcases"
on "campaign_showcases" for select to anon, authenticated
using (published = true);

create policy "admin can read all org campaign showcases"
on "campaign_showcases" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());
