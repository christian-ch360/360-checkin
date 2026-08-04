-- =============================================================================
-- store_connections RLS — mirrors the social_connections policy exactly.
-- Select-only: all writes go through the postgres-role Prisma client, which
-- bypasses RLS via table ownership. This grants row visibility (own rows,
-- plus org admins for the Platform Integrations panel), not plaintext token
-- exposure — accessTokenEnc/refreshTokenEnc are encrypted at rest and the
-- decryption key never leaves the app server.
-- =============================================================================

ALTER TABLE "public"."store_connections" ENABLE ROW LEVEL SECURITY;

create policy "member can read own store connections, admin org-wide"
on "store_connections" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "store_connections"."memberId" and m."organizationId" = rls.org_id())
  )
);
