-- Member-number generation was previously `member.count() + 1`
-- (src/features/members/services/member-number.ts), which is unsafe against
-- any historical deletion: once total row count drops below the highest
-- number ever issued, count()+1 recomputes an already-taken number. That
-- collided in production (CH360-000132 already existed while count() = 131),
-- and every retry recomputed the identical colliding number since count()
-- doesn't change between failed attempts within the same request.
--
-- A native Postgres sequence is the standard, atomic, concurrency-safe
-- replacement: nextval() is guaranteed by Postgres to never return the same
-- value twice, even to two transactions calling it at the exact same
-- instant, with no application-level locking required. It is also immune to
-- gaps — it always advances from its own last value, never recomputed from
-- current row count.
--
-- This migration is purely additive: it does not alter, delete, or
-- renumber any existing Member row, and does not touch the members_email_key
-- or members_memberNumber_key unique constraints, which remain the
-- database-level backstop.
CREATE SEQUENCE IF NOT EXISTS member_number_seq;

-- Seed the sequence from whatever the actual current data is *at the moment
-- this migration runs* (not a hardcoded number) — so it's correct whenever
-- it's actually applied (now, or against a database that has grown further
-- by the time this deploys), and the very next nextval() call is guaranteed
-- to be higher than every memberNumber that already exists, including
-- CH360-000132.
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING("memberNumber" FROM 7) AS INTEGER)), 0)
    INTO max_num
    FROM members
    WHERE "memberNumber" ~ '^CH360-[0-9]{6}$';

  -- setval(seq, max_num, true) sets the sequence's "last value used" to
  -- max_num, so the next nextval() call returns max_num + 1.
  PERFORM setval('member_number_seq', max_num, true);
END $$;
