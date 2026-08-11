"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { logAudit } from "@/lib/db/audit-log";
import { logAgencyActivity } from "@/features/agencies/services/agency-activity.service";
import { notifyAgencyAdmins } from "@/features/agencies/services/agency-access.service";
import { createNotification } from "@/lib/notifications";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canApproveCampaign, canBrandContactReviewDeliverable, canManageCampaigns, canDeleteCampaign } from "@/features/agencies/config/agency-permissions";
import { getCampaignCreatorIds } from "@/features/agencies/services/campaign.service";
import { uploadAgencyFile } from "@/lib/supabase/storage";
import type { CampaignStatus, DeliverableStatus } from "@prisma/client";

export type CampaignActionResult = { success: true; campaignId?: string } | { success: false; error: string };

const campaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  brandId: z.string().uuid("Select a brand"),
  description: z.string().trim().max(2000).optional(),
  budget: z.coerce.number().min(0).default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

async function requireCampaignManager() {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  if (!canManageCampaigns(actor.agencyRole)) {
    return { actor, agencyId, allowed: false as const, error: "You don't have permission to manage campaigns." };
  }
  return { actor, agencyId, allowed: true as const };
}

export async function createCampaign(input: z.infer<typeof campaignSchema>): Promise<CampaignActionResult> {
  const check = await requireCampaignManager();
  if (!check.allowed) return { success: false, error: check.error };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const brand = await prisma.brand.findFirst({ where: { id: parsed.data.brandId, organizationId: check.actor.organizationId } });
  if (!brand) return { success: false, error: "Brand not found." };

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: check.actor.organizationId,
      agencyId: check.agencyId,
      brandId: parsed.data.brandId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      budget: parsed.data.budget,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      createdById: check.actor.id,
    },
  });

  await logAudit({
    organizationId: check.actor.organizationId,
    actorId: check.actor.id,
    action: "campaign.created",
    entityType: "campaign",
    entityId: campaign.id,
    after: { title: campaign.title, brandId: campaign.brandId },
  });
  await logAgencyActivity({
    organizationId: check.actor.organizationId,
    agencyId: check.agencyId,
    type: "CAMPAIGN_CREATED",
    actorId: check.actor.id,
    message: `${check.actor.fullName} created campaign "${campaign.title}"`,
  });

  revalidatePath("/agency/campaigns");
  revalidatePath("/agency");
  return { success: true, campaignId: campaign.id };
}

export async function updateCampaign(campaignId: string, input: z.infer<typeof campaignSchema>): Promise<CampaignActionResult> {
  const check = await requireCampaignManager();
  if (!check.allowed) return { success: false, error: check.error };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!campaign) return { success: false, error: "Campaign not found." };

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      title: parsed.data.title,
      brandId: parsed.data.brandId,
      description: parsed.data.description || null,
      budget: parsed.data.budget,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    },
  });

  revalidatePath(`/agency/campaigns/${campaignId}`);
  revalidatePath("/agency/campaigns");
  return { success: true, campaignId };
}

export async function deleteCampaign(campaignId: string): Promise<CampaignActionResult> {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  if (!canDeleteCampaign(actor.agencyRole)) return { success: false, error: "You don't have permission to delete campaigns." };

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: actor.organizationId, agencyId } });
  if (!campaign) return { success: false, error: "Campaign not found." };

  await prisma.campaign.delete({ where: { id: campaignId } });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "campaign.deleted",
    entityType: "campaign",
    entityId: campaignId,
    before: { title: campaign.title },
  });

  revalidatePath("/agency/campaigns");
  return { success: true };
}

async function setCampaignStatus(campaignId: string, status: CampaignStatus, requireApprover: boolean): Promise<CampaignActionResult> {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  const allowed = requireApprover ? canApproveCampaign(actor.agencyRole) : canManageCampaigns(actor.agencyRole);
  if (!allowed) return { success: false, error: "You don't have permission to change this campaign's status." };

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: actor.organizationId, agencyId } });
  if (!campaign) return { success: false, error: "Campaign not found." };

  await prisma.campaign.update({ where: { id: campaignId }, data: { status } });

  await logAgencyActivity({
    organizationId: actor.organizationId,
    agencyId,
    type: "CAMPAIGN_STATUS_CHANGED",
    actorId: actor.id,
    message: `${actor.fullName} moved "${campaign.title}" to ${status.replace("_", " ").toLowerCase()}`,
  });

  revalidatePath(`/agency/campaigns/${campaignId}`);
  revalidatePath("/agency/campaigns");
  return { success: true, campaignId };
}

export async function submitCampaignForApproval(campaignId: string) {
  return setCampaignStatus(campaignId, "PENDING_APPROVAL", false);
}
export async function approveCampaign(campaignId: string) {
  return setCampaignStatus(campaignId, "ACTIVE", true);
}
export async function completeCampaign(campaignId: string) {
  return setCampaignStatus(campaignId, "COMPLETED", false);
}
export async function cancelCampaign(campaignId: string) {
  return setCampaignStatus(campaignId, "CANCELLED", false);
}

export async function addCampaignCreator(campaignId: string, creatorId: string): Promise<CampaignActionResult> {
  const check = await requireCampaignManager();
  if (!check.allowed) return { success: false, error: check.error };

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!campaign) return { success: false, error: "Campaign not found." };

  const creator = await prisma.member.findFirst({ where: { id: creatorId, organizationId: check.actor.organizationId, role: "CREATOR" } });
  if (!creator) return { success: false, error: "Creator not found." };

  await prisma.campaignCreator.upsert({
    where: { campaignId_creatorId: { campaignId, creatorId } },
    update: {},
    create: { campaignId, creatorId },
  });

  await createNotification(creatorId, {
    type: "CAMPAIGN_APPROVAL_NEEDED",
    title: `You were added to campaign "${campaign.title}"`,
    link: "/agency/campaigns",
  });

  revalidatePath(`/agency/campaigns/${campaignId}`);
  return { success: true, campaignId };
}

export async function removeCampaignCreator(campaignId: string, creatorId: string): Promise<CampaignActionResult> {
  const check = await requireCampaignManager();
  if (!check.allowed) return { success: false, error: check.error };

  await prisma.campaignCreator.deleteMany({ where: { campaignId, creatorId } });
  revalidatePath(`/agency/campaigns/${campaignId}`);
  return { success: true, campaignId };
}

const deliverableSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.string().optional(),
  assignedCreatorId: z.string().uuid().optional(),
});

export async function createDeliverable(campaignId: string, input: z.infer<typeof deliverableSchema>): Promise<CampaignActionResult> {
  const check = await requireCampaignManager();
  if (!check.allowed) return { success: false, error: check.error };

  const parsed = deliverableSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!campaign) return { success: false, error: "Campaign not found." };

  await prisma.campaignDeliverable.create({
    data: {
      campaignId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assignedCreatorId: parsed.data.assignedCreatorId || null,
    },
  });

  if (parsed.data.assignedCreatorId) {
    await createNotification(parsed.data.assignedCreatorId, {
      type: "TASK_ASSIGNED",
      title: `New deliverable on "${campaign.title}": ${parsed.data.title}`,
      link: "/agency/campaigns",
    });
  }

  revalidatePath(`/agency/campaigns/${campaignId}`);
  return { success: true, campaignId };
}

/** The assigned creator submits their work — the deliverable moves PENDING/REJECTED -> SUBMITTED. */
export async function submitDeliverable(deliverableId: string, submittedUrl: string): Promise<CampaignActionResult> {
  const actor = await requireCurrentMember();

  const deliverable = await prisma.campaignDeliverable.findFirst({
    where: { id: deliverableId, campaign: { organizationId: actor.organizationId } },
    include: { campaign: { select: { id: true, title: true, agencyId: true, brandId: true } } },
  });
  if (!deliverable) return { success: false, error: "Deliverable not found." };
  if (deliverable.assignedCreatorId !== actor.id) return { success: false, error: "Only the assigned creator can submit this deliverable." };

  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: "SUBMITTED", submittedUrl: submittedUrl.trim() },
  });

  await notifyAgencyAdmins(actor.organizationId, deliverable.campaign.agencyId, {
    type: "CAMPAIGN_APPROVAL_NEEDED",
    title: `${actor.fullName} submitted "${deliverable.title}"`,
    body: `Deliverable for campaign "${deliverable.campaign.title}" is ready for review.`,
  });

  revalidatePath(`/agency/campaigns/${deliverable.campaign.id}`);
  return { success: true, campaignId: deliverable.campaign.id };
}

/** Agency admin OR the campaign's Brand Contact can approve/reject a submitted deliverable — the Brand Contact's one write action. */
export async function reviewDeliverable(deliverableId: string, status: Extract<DeliverableStatus, "APPROVED" | "REJECTED">): Promise<CampaignActionResult> {
  const actor = await requireCurrentMember();

  const deliverable = await prisma.campaignDeliverable.findFirst({
    where: { id: deliverableId, campaign: { organizationId: actor.organizationId } },
    include: { campaign: { select: { id: true, title: true, agencyId: true, brandId: true } } },
  });
  if (!deliverable) return { success: false, error: "Deliverable not found." };

  const agencyId = effectiveAgencyIdFor(actor);
  const isAgencyAdminForCampaign = agencyId === deliverable.campaign.agencyId && canApproveCampaign(actor.agencyRole);
  const isBrandContact = canBrandContactReviewDeliverable(actor.brandId, deliverable.campaign.brandId);
  if (!isAgencyAdminForCampaign && !isBrandContact) {
    return { success: false, error: "You don't have permission to review this deliverable." };
  }

  await prisma.campaignDeliverable.update({ where: { id: deliverableId }, data: { status } });

  if (deliverable.assignedCreatorId) {
    await createNotification(deliverable.assignedCreatorId, {
      type: status === "APPROVED" ? "CAMPAIGN_APPROVAL_NEEDED" : "TASK_ASSIGNED",
      title: `Your deliverable "${deliverable.title}" was ${status === "APPROVED" ? "approved" : "sent back"}`,
      link: "/agency/campaigns",
    });
  }

  revalidatePath(`/agency/campaigns/${deliverable.campaign.id}`);
  return { success: true, campaignId: deliverable.campaign.id };
}

export async function deleteDeliverable(deliverableId: string): Promise<CampaignActionResult> {
  const check = await requireCampaignManager();
  if (!check.allowed) return { success: false, error: check.error };

  const deliverable = await prisma.campaignDeliverable.findFirst({
    where: { id: deliverableId, campaign: { organizationId: check.actor.organizationId, agencyId: check.agencyId } },
  });
  if (!deliverable) return { success: false, error: "Deliverable not found." };

  await prisma.campaignDeliverable.delete({ where: { id: deliverableId } });
  revalidatePath(`/agency/campaigns/${deliverable.campaignId}`);
  return { success: true };
}

export async function uploadCampaignAttachment(campaignId: string, formData: FormData): Promise<CampaignActionResult> {
  const check = await requireCampaignManager();
  if (!check.allowed) return { success: false, error: check.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choose a file to upload." };

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!campaign) return { success: false, error: "Campaign not found." };

  const path = `${check.actor.organizationId}/${check.agencyId}/campaigns/${campaignId}/${crypto.randomUUID()}-${file.name}`;
  const url = await uploadAgencyFile(path, file);

  await prisma.file.create({
    data: {
      organizationId: check.actor.organizationId,
      campaignId,
      uploadedById: check.actor.id,
      name: file.name,
      url,
      mimeType: file.type || null,
      sizeBytes: file.size,
    },
  });

  revalidatePath(`/agency/campaigns/${campaignId}`);
  return { success: true, campaignId };
}

export async function deleteCampaignAttachment(fileId: string): Promise<CampaignActionResult> {
  const check = await requireCampaignManager();
  if (!check.allowed) return { success: false, error: check.error };

  const file = await prisma.file.findFirst({ where: { id: fileId, campaign: { organizationId: check.actor.organizationId, agencyId: check.agencyId } } });
  if (!file || !file.campaignId) return { success: false, error: "File not found." };

  await prisma.file.delete({ where: { id: fileId } });
  revalidatePath(`/agency/campaigns/${file.campaignId}`);
  return { success: true, campaignId: file.campaignId };
}

export async function assertCanViewCampaign(campaignId: string) {
  const actor = await requireCurrentMember();
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: actor.organizationId } });
  if (!campaign) return { allowed: false as const };

  const agencyId = effectiveAgencyIdFor(actor);
  if (agencyId === campaign.agencyId) return { allowed: true as const, campaign };
  if (canBrandContactReviewDeliverable(actor.brandId, campaign.brandId)) return { allowed: true as const, campaign };

  const creatorIds = await getCampaignCreatorIds(campaignId);
  if (creatorIds.includes(actor.id)) return { allowed: true as const, campaign };

  return { allowed: false as const };
}
