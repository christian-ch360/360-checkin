ALTER TABLE "public"."event_check_ins" ENABLE ROW LEVEL SECURITY;

create policy "member can read own event check-ins, admin org-wide"
on "event_check_ins" for select to authenticated
using (
  "memberId" = rls.member_id()
  or (rls.is_admin() and exists (
    select 1 from events e where e.id = "event_check_ins"."eventId" and e."organizationId" = rls.org_id()
  ))
);
