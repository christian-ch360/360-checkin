import "server-only";

import { Prisma, type MemberRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isReferralEligibleRole, referralCodePrefixFor } from "@/features/referrals/config/referral-config";

const PAD_LENGTH = 6;

/**
 * Generates the next sequential referral code for a role (e.g. "AGY-001284")
 * — same count-based approach as generateMemberNumber, scoped to rows
 * sharing this role's prefix so each referral-eligible role gets its own
 * independent sequence. Permanent once assigned: nothing in this codebase
 * ever updates Member.referralCode after creation.
 */
export async function generateReferralCode(role: MemberRole): Promise<string> {
  const prefix = referralCodePrefixFor(role);
  if (!prefix) throw new Error(`${role} is not a referral-eligible role.`);

  const count = await prisma.member.count({ where: { referralCode: { startsWith: `${prefix}-` } } });
  return `${prefix}-${String(count + 1).padStart(PAD_LENGTH, "0")}`;
}

/**
 * Mints and persists a permanent referral code for a newly created member,
 * if (and only if) their role is referral-eligible and they don't already
 * have one. Called once, from provisionMemberOnboarding, so every path that
 * creates a Member (direct admin add, application approval) gets this for
 * free with zero extra call sites — "Auto-generated" per the spec, no
 * manual step anywhere. Retries on the rare unique-constraint race the same
 * way generateMemberNumber's callers do.
 */
export async function ensureReferralCode(memberId: string, role: MemberRole): Promise<string | null> {
  if (!isReferralEligibleRole(role)) return null;

  const existing = await prisma.member.findUnique({ where: { id: memberId }, select: { referralCode: true } });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await generateReferralCode(role);
    try {
      await prisma.member.update({ where: { id: memberId }, data: { referralCode: code } });
      return code;
    } catch (error) {
      const isConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (isConflict && attempt < 4) continue;
      throw error;
    }
  }
  return null;
}
