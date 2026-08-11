import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/utils/format";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canApproveCampaign, canManageCampaigns, canDeleteCampaign, canBrandContactReviewDeliverable } from "@/features/agencies/config/agency-permissions";
import { getCampaign } from "@/features/agencies/services/campaign.service";
import { assertCanViewCampaign } from "@/features/agencies/services/campaign-actions";
import { listCreatorsForAgency } from "@/features/agencies/services/creator-roster.service";
import { listCampaignTasks } from "@/features/agencies/services/agency-task.service";
import { listCampaignFiles } from "@/features/agencies/services/agency-file.service";
import { CampaignStatusBadge } from "@/features/agencies/components/crm-status-badge";
import { CampaignStatusActions } from "@/features/agencies/components/campaign-status-actions";
import { CampaignCreatorsPanel } from "@/features/agencies/components/campaign-creators-panel";
import { CampaignDeliverablesPanel } from "@/features/agencies/components/campaign-deliverables-panel";
import { CampaignTasksPanel } from "@/features/agencies/components/campaign-tasks-panel";
import { CampaignAttachmentsPanel } from "@/features/agencies/components/campaign-attachments-panel";

export const dynamic = "force-dynamic";

export default async function AgencyCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireCurrentMember();

  const access = await assertCanViewCampaign(id);
  if (!access.allowed) redirect("/dashboard");

  const agencyId = effectiveAgencyIdFor(actor);
  const isAgencyOwner = agencyId === access.campaign.agencyId;

  const [campaign, roster, tasks, files] = await Promise.all([
    getCampaign(actor.organizationId, id),
    isAgencyOwner ? listCreatorsForAgency(actor.organizationId, agencyId) : Promise.resolve([]),
    listCampaignTasks(id),
    listCampaignFiles(id),
  ]);

  if (!campaign) notFound();

  const canManage = isAgencyOwner && canManageCampaigns(actor.agencyRole);
  const canApprove = isAgencyOwner && canApproveCampaign(actor.agencyRole);
  const canDelete = isAgencyOwner && canDeleteCampaign(actor.agencyRole);
  const canReview = (isAgencyOwner && canApprove) || canBrandContactReviewDeliverable(actor.brandId, campaign.brandId);

  return (
    <div className="space-y-6">
      <Link href="/agency/campaigns" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>

      <PageHeader
        title={campaign.title}
        description={`${campaign.brand.name} · Budget ${formatCompactCurrency(Number(campaign.budget))}`}
        actions={
          <div className="flex items-center gap-3">
            <CampaignStatusBadge status={campaign.status} />
            <CampaignStatusActions campaignId={id} status={campaign.status} canManage={canManage} canApprove={canApprove} canDelete={canDelete} />
          </div>
        }
      />

      {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignCreatorsPanel
              campaignId={id}
              assigned={campaign.creators.map((c) => c.creator)}
              available={roster.map((c) => ({ id: c.id, fullName: c.fullName, profilePhotoUrl: c.profilePhotoUrl }))}
              canManage={canManage}
            />
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Deliverables & Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignDeliverablesPanel
              campaignId={id}
              deliverables={campaign.deliverables}
              creators={campaign.creators.map((c) => ({ id: c.creator.id, fullName: c.creator.fullName }))}
              actorId={actor.id}
              canManage={canManage}
              canReview={canReview}
            />
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignTasksPanel campaignId={id} tasks={tasks} canManage={canManage} />
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignAttachmentsPanel campaignId={id} attachments={files} canManage={canManage} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
