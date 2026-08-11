import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function listCampaignTasks(campaignId: string) {
  return prisma.task.findMany({
    where: { campaignId },
    include: { comments: { include: { member: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "asc" } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
}

export type CampaignTaskItem = Awaited<ReturnType<typeof listCampaignTasks>>[number];

/** For the Agency Dashboard's Tasks section — open tasks across every campaign, soonest due date first. */
export async function listAgencyTasksDueSoon(organizationId: string, agencyId: string, take = 8) {
  return prisma.task.findMany({
    where: {
      status: { not: "done" },
      campaign: { organizationId, agencyId },
    },
    include: { campaign: { select: { id: true, title: true } } },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    take,
  });
}
