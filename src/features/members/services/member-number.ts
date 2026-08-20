import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const PREFIX = "CH360";
const PAD_LENGTH = 6;

/**
 * Generates the next member number (e.g. CH360-000132) from the
 * `member_number_seq` Postgres sequence (see the
 * 20260820020000_member_number_sequence migration) — not `member.count() + 1`.
 * Count-based generation was unsafe against any historical deletion: once
 * total row count drops below the highest number ever issued, count()+1
 * recomputes an already-taken number, and every retry recomputes the exact
 * same colliding number since count() doesn't change between failed
 * attempts. A native sequence's nextval() is atomic and monotonically
 * increasing — Postgres guarantees it never returns the same value twice,
 * even to two transactions calling it at the same instant, with no
 * application-level locking required, and it's immune to gaps since it
 * always advances from its own last value rather than being recomputed from
 * current row count.
 */
export async function generateMemberNumber(): Promise<string> {
  const result = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('member_number_seq') AS nextval`;
  const n = Number(result[0].nextval);
  return `${PREFIX}-${String(n).padStart(PAD_LENGTH, "0")}`;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/**
 * Same P2002 check as `isUniqueConstraintError`, but also confirms the
 * violated constraint actually covers `field` (via Prisma's `meta.target`,
 * which for the Postgres provider is the list of column names involved) —
 * so callers that retry on a generic constraint clash (e.g. memberNumber)
 * can tell that apart from a genuine email collision instead of guessing.
 */
export function isUniqueConstraintErrorOnField(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  if (typeof target === "string") return target.includes(field);
  return false;
}
