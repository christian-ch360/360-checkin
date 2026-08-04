ALTER TABLE "public"."membership_features" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_plan_feature_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_usage_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_pricing_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_lifecycle_events" ENABLE ROW LEVEL SECURITY;

create policy "org member can read org membership features"
on "membership_features" for select to authenticated
using ("organizationId" = rls.org_id());

create policy "anyone can read feature values of active plans"
on "membership_plan_feature_values" for select to anon, authenticated
using (
  exists (select 1 from membership_plans p where p.id = "membership_plan_feature_values"."planId" and p."isActive" = true)
);

create policy "org member can read own org feature values"
on "membership_plan_feature_values" for select to authenticated
using (
  exists (
    select 1 from membership_plans p
    where p.id = "membership_plan_feature_values"."planId" and p."organizationId" = rls.org_id()
  )
);

create policy "member can read own usage, admin org-wide"
on "membership_usage_counters" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (rls.is_admin() and exists (select 1 from members m where m.id = "membership_usage_counters"."memberId" and m."organizationId" = rls.org_id()))
);

create policy "admin can read org pricing schedules"
on "membership_pricing_schedules" for select to authenticated
using (
  rls.is_admin()
  and exists (select 1 from membership_plans p where p.id = "membership_pricing_schedules"."planId" and p."organizationId" = rls.org_id())
);

create policy "admin can read org lifecycle events"
on "membership_lifecycle_events" for select to authenticated
using (rls.is_admin() and "organizationId" = rls.org_id());
