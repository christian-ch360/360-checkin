import "server-only";

import { startOfDay, startOfWeek, startOfMonth } from "date-fns";
import type { AgencyActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** GMV thresholds that fire a one-time "Agency reached $X" activity entry per agency. */
const GMV_MILESTONES = [10_000, 100_000, 1_000_000];

export type LogAgencyActivityInput = {
  organizationId: string;
  agencyId: string;
  type: AgencyActivityType;
  message: string;
  actorId?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * "Team Activity Feed" — writes one pre-rendered, human-readable entry.
 * Deliberately separate from logAudit (see the AgencyActivity model comment
 * in schema.prisma): callers that also need a compliance-grade audit trail
 * call both, since each produces a different shape for a different
 * consumer. Never throws — a failed activity-feed write must never take
 * down the underlying action it's describing.
 */
export async function logAgencyActivity(input: LogAgencyActivityInput): Promise<void> {
  try {
    await prisma.agencyActivity.create({
      data: {
        organizationId: input.organizationId,
        agencyId: input.agencyId,
        type: input.type,
        actorId: input.actorId ?? null,
        targetId: input.targetId ?? null,
        message: input.message,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    console.error("logAgencyActivity: failed to write activity entry", err);
  }
}

export type AgencyActivityFilter = "today" | "week" | "month" | "all";

export type AgencyActivityEntry = {
  id: string;
  type: AgencyActivityType;
  message: string;
  actorName: string | null;
  targetName: string | null;
  createdAt: Date;
};

export async function getAgencyActivity(
  organizationId: string,
  agencyId: string,
  filter: AgencyActivityFilter = "all",
  take = 50
): Promise<AgencyActivityEntry[]> {
  const now = new Date();
  const since =
    filter === "today"
      ? startOfDay(now)
      : filter === "week"
        ? startOfWeek(now)
        : filter === "month"
          ? startOfMonth(now)
          : undefined;

  const entries = await prisma.agencyActivity.findMany({
    where: { organizationId, agencyId, ...(since ? { createdAt: { gte: since } } : {}) },
    include: {
      actor: { select: { fullName: true } },
      target: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return entries.map((e) => ({
    id: e.id,
    type: e.type,
    message: e.message,
    actorName: e.actor?.fullName ?? null,
    targetName: e.target?.fullName ?? null,
    createdAt: e.createdAt,
  }));
}

/**
 * "Creator generated first GMV" / "Agency reached $10K/$100K/$1M" —
 * evaluated after a GMV transaction is recorded for a creator connected to
 * an agency. Non-blocking by design (see recordGMVAndCommission's call
 * site): a milestone-detection failure must never break GMV recording
 * itself, which is why every step here is wrapped and logged rather than
 * thrown.
 */
export async function checkGmvMilestones(organizationId: string, creatorMemberId: string): Promise<void> {
  try {
    const creator = await prisma.member.findFirst({
      where: { id: creatorMemberId, organizationId, referredByMemberId: { not: null } },
      select: { id: true, fullName: true, referredByMemberId: true },
    });
    if (!creator || !creator.referredByMemberId) return;

    const agencyId = creator.referredByMemberId;
    const priorTransactionCount = await prisma.gMVTransaction.count({ where: { memberId: creator.id } });
    if (priorTransactionCount === 1) {
      // This GMV recording call created the transaction already, so a count
      // of exactly 1 means this was the creator's first ever.
      await logAgencyActivity({
        organizationId,
        agencyId,
        type: "FIRST_GMV",
        actorId: null,
        targetId: creator.id,
        message: `${creator.fullName} generated their first GMV`,
      });
    }

    const agencyLifetimeGMV = await prisma.gMVTransaction.aggregate({
      where: { member: { organizationId, referredByMemberId: agencyId } },
      _sum: { amount: true },
    });
    const total = Number(agencyLifetimeGMV._sum.amount ?? 0);
    // Fire at most once per threshold — guarded by checking no prior
    // GMV_MILESTONE activity for this exact threshold exists yet, rather
    // than trying to diff before/after within a single call.
    for (const threshold of GMV_MILESTONES) {
      if (total < threshold) continue;
      const already = await prisma.agencyActivity.findFirst({
        where: { organizationId, agencyId, type: "GMV_MILESTONE", metadata: { equals: { threshold } } },
        select: { id: true },
      });
      if (already) continue;
      await logAgencyActivity({
        organizationId,
        agencyId,
        type: "GMV_MILESTONE",
        actorId: null,
        targetId: null,
        message: `Agency reached $${threshold.toLocaleString()} in lifetime GMV`,
        metadata: { threshold },
      });
    }
  } catch (err) {
    console.error("checkGmvMilestones: failed", err);
  }
}
