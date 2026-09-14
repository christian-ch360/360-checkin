import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Inbox } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";
import { getPrimaryOrganizationId } from "@/features/creator-library/services/creator-library.service";
import { listCampaignRequests, getCampaignRequest } from "@/features/creator-library/services/campaign-request.service";
import { CAMPAIGN_TYPE_LABELS, CAMPAIGN_GOAL_LABELS, CAMPAIGN_DELIVERABLE_LABELS, DESIRED_REACH_TIER_LABELS, CAMPAIGN_LOCATION_SCOPE_LABELS, CAMPAIGN_BUDGET_FLEXIBILITY_LABELS } from "@/features/creator-library/config/campaign-config";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import { CampaignRequestStatusSelect } from "@/features/creator-library/admin/campaign-request-status-select";

export const dynamic = "force-dynamic";

export const metadata = { title: "Campaign Requests · Creator Library" };

function formatMoney(value: number | null): string {
  return value == null ? "Not specified" : `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatLocation(scope: string, country: string | null, state: string | null, city: string | null): string {
  if (scope === "WORLDWIDE") return "Worldwide";
  const parts = [city, state, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : CAMPAIGN_LOCATION_SCOPE_LABELS[scope as keyof typeof CAMPAIGN_LOCATION_SCOPE_LABELS];
}

export default async function AdminCampaignRequestsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  const organizationId = (await getPrimaryOrganizationId()) ?? actor.organizationId;
  const summaries = await listCampaignRequests(organizationId);
  const requests = await Promise.all(summaries.map((s) => getCampaignRequest(organizationId, s.id)));

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <PageHeader
        title="Campaign Requests"
        description="Brand campaign requests submitted through the public Creator Library. Never visible to the brand — this is the only place to review them."
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No campaign requests yet"
          description="Requests submitted from /creator-library/campaigns/new will show up here."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            if (!request) return null;
            return (
              <div key={request.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {format(request.createdAt, "MMM d, yyyy · h:mm a")}
                    </p>
                    <h2 className="mt-0.5 text-lg font-semibold">{request.campaignName}</h2>
                    <p className="text-sm text-muted-foreground">{CAMPAIGN_TYPE_LABELS[request.campaignType]}</p>
                  </div>
                  <CampaignRequestStatusSelect id={request.id} status={request.internalStatus} />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Company" value={request.brandName ?? "Not provided"} />
                  <Field label="Website" value={request.brandWebsite ?? "Not provided"} />
                  <Field label="Contact" value={request.contactName ?? "Not provided"} />
                  <Field label="Email" value={request.contactEmail ?? "Not provided"} />
                  <Field label="Phone" value={request.contactPhone ?? "Not provided"} />
                  <Field label="Timeline" value={request.timeline ?? "Not specified"} />
                  <Field label="Budget" value={formatMoney(request.totalBudget)} />
                  <Field
                    label="Budget per creator"
                    value={request.preferredBudgetPerCreator != null ? formatMoney(request.preferredBudgetPerCreator) : "Not specified"}
                  />
                  <Field
                    label="Budget flexibility"
                    value={request.budgetFlexibility ? CAMPAIGN_BUDGET_FLEXIBILITY_LABELS[request.budgetFlexibility] : "Not specified"}
                  />
                  <Field label="Creators needed" value={request.creatorCount != null ? String(request.creatorCount) : "Not specified"} />
                  <Field
                    label="Desired reach"
                    value={request.reachTiers.length > 0 ? request.reachTiers.map((t) => DESIRED_REACH_TIER_LABELS[t]).join(", ") : "Not specified"}
                  />
                  <Field label="Location" value={formatLocation(request.locationScope, request.country, request.state, request.city)} />
                  <Field label="Platforms" value={request.platforms.length > 0 ? request.platforms.join(", ") : "Not specified"} />
                  <Field
                    label="Categories"
                    value={request.categories.length > 0 ? request.categories.map((c) => CONTENT_CATEGORY_LABELS[c]).join(", ") : "Not specified"}
                  />
                  <Field
                    label="Deliverables"
                    value={request.deliverables.length > 0 ? request.deliverables.map((d) => CAMPAIGN_DELIVERABLE_LABELS[d]).join(", ") : "Not specified"}
                  />
                  <Field
                    label="Goals"
                    value={request.goals.length > 0 ? request.goals.map((g) => CAMPAIGN_GOAL_LABELS[g]).join(", ") : "Not specified"}
                  />
                </div>

                {request.objective || request.description ? (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    {request.objective ? (
                      <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Objective</p>
                        <p className="mt-0.5 text-sm">{request.objective}</p>
                      </div>
                    ) : null}
                    {request.description ? (
                      <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Campaign Details</p>
                        <p className="mt-0.5 text-sm whitespace-pre-wrap">{request.description}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}
