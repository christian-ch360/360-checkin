-- RLS for the 4 new tables added in 20260728180354_email_system_and_feature_buildout,
-- following the same least-privilege model as 20260723210000_least_privilege_rls_policies
-- (Prisma connects as `postgres` and bypasses all of this; these policies only
-- govern the anon/authenticated Supabase Data API path).

alter table "collab_post_likes" enable row level security;
alter table "follows" enable row level security;
alter table "project_invitations" enable row level security;
alter table "project_collaboration_requests" enable row level security;

create policy "org member can read collab post likes"
on "collab_post_likes" for select to authenticated
using (
  exists (
    select 1 from collab_posts cp
    where cp.id = "collab_post_likes"."collabPostId" and cp."organizationId" = rls.org_id()
  )
);

create policy "either party can read a follow"
on "follows" for select to authenticated
using ("followerId" = rls.member_id() or "followingId" = rls.member_id());

-- project_invitations carries a bare `token` column that IS the credential
-- (a single-use project-join link) — same reasoning as the existing
-- `invitations`/`qr_assets` tables. No policy is added: service-role only.

create policy "project members and admin can read collaboration requests"
on "project_collaboration_requests" for select to authenticated
using ("memberId" = rls.member_id() or rls.can_access_project("projectId"));

-- The existing comments policy only covered projectId-scoped rows; extend it
-- to also cover the new collabPostId-scoped rows (Collab Hub comments).
drop policy "project members, author, and admin can read comments" on "comments";

create policy "project/post members, author, and admin can read comments"
on "comments" for select to authenticated
using (
  "memberId" = rls.member_id()
  or ("projectId" is not null and rls.can_access_project("projectId"))
  or (
    "collabPostId" is not null
    and exists (select 1 from collab_posts cp where cp.id = "comments"."collabPostId" and cp."organizationId" = rls.org_id())
  )
);
