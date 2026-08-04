ALTER TABLE "public"."referral_links" ENABLE ROW LEVEL SECURITY;

create policy "referrer can read own referral links, admin org-wide"
on "referral_links" for select to authenticated
using (
  "referrerMemberId" = rls.member_id()
  or (rls.is_admin() and "organizationId" = rls.org_id())
);
