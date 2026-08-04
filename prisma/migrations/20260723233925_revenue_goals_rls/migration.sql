ALTER TABLE "public"."revenue_goals" ENABLE ROW LEVEL SECURITY;

create policy "member can read own revenue goal, admin org-wide"
on "revenue_goals" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (
    rls.is_admin()
    and exists (select 1 from members m where m.id = "revenue_goals"."memberId" and m."organizationId" = rls.org_id())
  )
);
