"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions";
import { notifyMembers } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";
import { LIBRARY_COOKIE_NAME, verifyLibraryToken } from "@/features/creator-library/auth/session";
import { getPrimaryOrganizationId } from "@/features/creator-library/services/creator-library.service";
import { campaignRequestSchema, type CampaignRequestInput } from "@/features/creator-library/schemas/campaign-request.schema";
import { createCampaignRequest } from "@/features/creator-library/services/campaign-request.service";
import {
  CAMPAIGN_BUDGET_FLEXIBILITY_LABELS,
  CAMPAIGN_DELIVERABLE_LABELS,
  CAMPAIGN_GOAL_LABELS,
  CAMPAIGN_LOCATION_SCOPE_LABELS,
  CAMPAIGN_TYPE_LABELS,
  DESIRED_REACH_TIER_LABELS,
} from "@/features/creator-library/config/campaign-config";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import type { CampaignRequestParsed } from "@/features/creator-library/schemas/campaign-request.schema";

/**
 * Auth for this action: the same shared-password cookie that gates the rest
 * of /creator-library — there is no authenticated member/session on this
 * public surface. This is intentionally the ONLY exported action in this
 * file. Reading campaign requests back (list, detail, changing review
 * status) is admin-only and lives in campaign-request-admin.actions.ts,
 * gated by `requireCurrentMember()` + `hasPermission(..., "members.manage")`
 * — never reachable from here.
 */
async function requireLibraryAccess(): Promise<{ organizationId: string } | { error: string }> {
  const cookieStore = await cookies();
  const authed = await verifyLibraryToken(cookieStore.get(LIBRARY_COOKIE_NAME)?.value);
  if (!authed) return { error: "Your Creator Library session has expired. Please sign in again." };

  const organizationId = await getPrimaryOrganizationId();
  if (!organizationId) return { error: "The Creator Library isn't available right now." };
  return { organizationId };
}

export type SubmitCampaignRequestResult = { success: true } | { success: false; error: string };

/**
 * Step 6 "Find My Creators" — the brand-facing flow is now exactly:
 * validate → save → notify the internal team → confirm. No Modash/OpenAI
 * pipeline runs here, no campaign ID or status is ever returned to the
 * client, and there is nowhere for the brand to navigate to see this
 * request again — see campaign-builder.tsx's confirmation screen.
 */
export async function submitCampaignRequest(input: CampaignRequestInput): Promise<SubmitCampaignRequestResult> {
  const access = await requireLibraryAccess();
  if ("error" in access) return { success: false, error: access.error };

  const parsed = campaignRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Some fields need attention." };
  }

  const { id: campaignId } = await createCampaignRequest(access.organizationId, parsed.data);

  // Best-effort internal notification — a delivery failure here must never
  // surface to the brand (they've already gotten a clean confirmation) and
  // must never block the save that already happened above.
  await notifyInternalTeam(access.organizationId, campaignId, parsed.data).catch(() => {});

  return { success: true };
}

async function notifyInternalTeam(organizationId: string, campaignId: string, campaign: CampaignRequestParsed): Promise<void> {
  const admins = await prisma.member.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { id: true, email: true, fullName: true, systemRole: true },
  });
  const recipients = admins.filter((admin) => hasPermission(admin.systemRole, "members.manage"));
  if (recipients.length === 0) return;

  await notifyMembers(
    recipients.map((r) => r.id),
    {
      type: "CAMPAIGN_REQUEST_RECEIVED",
      title: `New campaign request: ${campaign.campaignName}`,
      body: [campaign.brandName, campaign.contactEmail].filter(Boolean).join(" · "),
      link: "/admin/creator-library/campaign-requests",
    },
  );

  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/creator-library/campaign-requests`;

  for (const admin of recipients) {
    await EmailService.sendCampaignRequestInternalEmail({
      to: admin.email,
      fullName: admin.fullName,
      organizationId,
      memberId: admin.id,
      campaignName: campaign.campaignName,
      brandName: campaign.brandName,
      brandWebsite: campaign.brandWebsite,
      contactName: campaign.contactName,
      contactEmail: campaign.contactEmail,
      contactPhone: campaign.contactPhone,
      campaignType: CAMPAIGN_TYPE_LABELS[campaign.campaignType],
      objective: campaign.objective || campaign.description,
      budget: formatBudget(campaign),
      categories: campaign.categories.map((c) => CONTENT_CATEGORY_LABELS[c]).join(", ") || "Not specified",
      platforms: campaign.platforms.join(", ") || "Not specified",
      desiredReach: campaign.reachTiers.map((t) => DESIRED_REACH_TIER_LABELS[t]).join(", ") || "Not specified",
      location: formatLocation(campaign),
      deliverables: campaign.deliverables.map((d) => CAMPAIGN_DELIVERABLE_LABELS[d]).join(", ") || "Not specified",
      creatorCount: campaign.creatorCount != null ? String(campaign.creatorCount) : "Not specified",
      timeline: campaign.timeline || "Not specified",
      reviewUrl,
    }).catch(() => {});
  }
}

function formatBudget(campaign: CampaignRequestParsed): string {
  const parts: string[] = [];
  if (campaign.totalBudget != null) parts.push(`$${campaign.totalBudget.toLocaleString("en-US")} total`);
  if (campaign.preferredBudgetPerCreator != null) parts.push(`$${campaign.preferredBudgetPerCreator.toLocaleString("en-US")} per creator preferred`);
  if (campaign.budgetFlexibility) parts.push(CAMPAIGN_BUDGET_FLEXIBILITY_LABELS[campaign.budgetFlexibility]);
  return parts.length > 0 ? parts.join(" · ") : "Not specified";
}

function formatLocation(campaign: CampaignRequestParsed): string {
  if (campaign.locationScope === "WORLDWIDE") return "Worldwide";
  const parts = [campaign.city, campaign.state, campaign.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : CAMPAIGN_LOCATION_SCOPE_LABELS[campaign.locationScope];
}
