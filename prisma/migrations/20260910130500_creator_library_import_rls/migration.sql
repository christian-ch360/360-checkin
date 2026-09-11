-- RLS for creator_import_batches, following 20260910120500_creator_library_rls
-- and the wider *_rls model: enable RLS, admin-org-wide SELECT only. Import
-- batches are internal Ops audit records, never public. No write policies —
-- every write goes through a Prisma server action gated on `members.manage`.
--
-- creator_library_profiles already has RLS + policies from
-- 20260910120500_creator_library_rls ("anyone can read visible ..." /
-- "admin can read all org ..."). Those `using (visible = true)` / admin
-- expressions apply unchanged to STANDALONE (memberId null) rows, so nothing
-- needs to change there.

ALTER TABLE "public"."creator_import_batches" ENABLE ROW LEVEL SECURITY;

create policy "admin can read org creator import batches"
on "creator_import_batches" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());
