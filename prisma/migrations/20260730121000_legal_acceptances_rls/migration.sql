ALTER TABLE "public"."legal_acceptances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_application_legal_acceptances" ENABLE ROW LEVEL SECURITY;

create policy "member can read own legal acceptances, admin org-wide"
on "legal_acceptances" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "legal_acceptances"."memberId" and m."organizationId" = rls.org_id())
  )
);

create policy "admin can read org membership application legal acceptances"
on "membership_application_legal_acceptances" for select to authenticated
using (
  rls.is_admin()
  and exists (
    select 1 from membership_applications a
    where a.id = "membership_application_legal_acceptances"."applicationId"
      and a."organizationId" = rls.org_id()
  )
);
