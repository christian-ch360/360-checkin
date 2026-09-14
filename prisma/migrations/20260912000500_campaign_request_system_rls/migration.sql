-- RLS for campaign_requests / campaign_candidates, defense-in-depth only
-- (same rationale as 20260910120500_creator_library_rls): every read/write
-- goes through a Prisma server action gated by the /creator-library shared-
-- password cookie + organizationId scoping in the service layer, not the
-- Supabase session. Unlike creator_library_profiles there is no legitimate
-- anon/public direct-read case here (a brand's own submissions are served by
-- the app, never queried straight off the Supabase Data API), so this adds
-- only the admin-org-wide read policy and otherwise locks the tables down
-- from the anon/authenticated Postgres roles entirely.

ALTER TABLE "public"."campaign_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_candidates" ENABLE ROW LEVEL SECURITY;

create policy "admin can read all org campaign requests"
on "campaign_requests" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());

create policy "admin can read all org campaign candidates"
on "campaign_candidates" for select to authenticated
using (
  rls.is_admin()
  and exists (
    select 1 from "campaign_requests" cr
    where cr.id = "campaign_candidates"."campaignId"
    and cr."organizationId" = rls.org_id()
  )
);
