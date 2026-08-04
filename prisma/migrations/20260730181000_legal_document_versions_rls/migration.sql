ALTER TABLE "public"."legal_document_versions" ENABLE ROW LEVEL SECURITY;

-- Published versions are the actual legal document content, readable at
-- /legal/* by anyone, signed in or not — same shape as membership_plans'
-- "anyone can read active plans" policy.
create policy "anyone can read published legal document versions"
on "legal_document_versions" for select to anon, authenticated
using ("status" = 'PUBLISHED');

-- Drafts (and the full version history) are an admin authoring surface —
-- org admins only, regardless of publish status.
create policy "org admin can read all legal document versions"
on "legal_document_versions" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());
