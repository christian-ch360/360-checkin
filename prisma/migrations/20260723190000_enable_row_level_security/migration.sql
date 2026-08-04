-- Enable Row Level Security on every table in the public schema.
--
-- Context: this app has no client-side PostgREST or Realtime usage — Prisma
-- (connected as the `postgres` role, which owns every table below and
-- therefore bypasses RLS by ownership) is the sole path for all reads and
-- writes, and the Supabase service-role key is used only for the Auth Admin
-- API (createUser / updateUserById in onboarding.ts and
-- communications-actions.ts), never for direct table access. The only
-- consumers of Supabase's auto-generated Data API on these tables are
-- therefore unauthorized: anyone holding the public anon key, or a member's
-- JWT used outside this app. With RLS enabled and zero policies defined,
-- both the anon and authenticated Postgres roles get zero rows for every
-- command (SELECT/INSERT/UPDATE/DELETE) on every table below — Postgres
-- denies by default when RLS is on and no policy matches. This fully closes
-- that path while leaving Prisma (table owner, not subject to RLS since
-- FORCE ROW LEVEL SECURITY is deliberately NOT set) untouched.
--
-- _prisma_migrations and _ReservationAttendees (Prisma's implicit
-- Reservation<->Member join table) are included: both still live in the
-- public schema and are just as reachable via the Data API as any
-- application table, so both get the same treatment for consistency.

ALTER TABLE "public"."_ReservationAttendees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."check_ins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."collab_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."collab_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."collab_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."collab_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."commission_tiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."commission_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."direct_conversation_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."direct_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."direct_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."event_rsvps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."gmv_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."qr_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scan_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."social_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."space_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."spaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."visitors" ENABLE ROW LEVEL SECURITY;
