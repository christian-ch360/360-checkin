"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";

export type CommunityModerationResult = { success: true } | { success: false; error: string };

const suspendSchema = z.object({ reason: z.string().trim().max(500).optional() });

export async function suspendMemberFromPosting(memberId: string, reason?: string): Promise<CommunityModerationResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "community.suspend")) {
    return { success: false, error: "You don't have permission to suspend members from posting." };
  }

  const parsed = suspendSchema.safeParse({ reason });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!member) return { success: false, error: "Member not found." };

  await prisma.member.update({
    where: { id: memberId },
    data: { communityPostingSuspendedAt: new Date(), communityPostingSuspendedReason: parsed.data.reason ?? null },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "community.member_suspended",
    entityType: "member",
    entityId: memberId,
    after: { reason: parsed.data.reason ?? null },
  });

  revalidatePath("/community");
  return { success: true };
}

export async function unsuspendMemberFromPosting(memberId: string): Promise<CommunityModerationResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "community.suspend")) {
    return { success: false, error: "You don't have permission to manage posting suspensions." };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId } });
  if (!member) return { success: false, error: "Member not found." };

  await prisma.member.update({
    where: { id: memberId },
    data: { communityPostingSuspendedAt: null, communityPostingSuspendedReason: null },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "community.member_unsuspended",
    entityType: "member",
    entityId: memberId,
  });

  revalidatePath("/community");
  return { success: true };
}

export async function reviewCommunityReport(
  reportId: string,
  status: "REVIEWED" | "DISMISSED"
): Promise<CommunityModerationResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "community.moderate")) {
    return { success: false, error: "You don't have permission to review reports." };
  }

  const report = await prisma.communityPostReport.findFirst({
    where: { id: reportId, post: { organizationId: actor.organizationId } },
  });
  if (!report) return { success: false, error: "Report not found." };

  await prisma.communityPostReport.update({
    where: { id: reportId },
    data: { status, reviewedAt: new Date(), reviewedById: actor.id },
  });

  revalidatePath("/community");
  return { success: true };
}

export async function listPendingCommunityReports(organizationId: string) {
  return prisma.communityPostReport.findMany({
    where: { status: "PENDING", post: { organizationId } },
    include: {
      post: { select: { id: true, body: true, author: { select: { fullName: true } } } },
      reporter: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
