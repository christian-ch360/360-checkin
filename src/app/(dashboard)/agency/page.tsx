import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Trophy,
  Users2,
  Settings2,
  Briefcase,
  Megaphone,
  FileSignature,
  Receipt,
  ListChecks,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompactCurrency } from "@/lib/utils/format";
import { ensureReferralCode } from "@/features/referrals/services/referral-code";
import {
  getAgencyDashboardData,
  listReferralsForAgency,
  getAgencyRequestStats,
  getPendingRequestsForAgency,
} from "@/features/referrals/services/referral.service";
import { AgencyReferralCard } from "@/features/referrals/components/agency-referral-card";
import { PendingRequestsCard } from "@/features/referrals/components/pending-requests-card";
import { getAgencyTeam, getPendingAccessRequestsForAgency, isAgencyAdmin } from "@/features/agencies/services/agency-access.service";
import { AgencyTeamCard } from "@/features/agencies/components/agency-team-card";
import { PendingAccessRequestsCard } from "@/features/agencies/components/pending-access-requests-card";
import { listBrandsForAgency } from "@/features/brands/services/brands.service";
import { getCampaignStatusCounts } from "@/features/agencies/services/campaign.service";
import { getExpiringContracts, listContracts } from "@/features/agencies/services/contract.service";
import { getInvoiceSummary } from "@/features/agencies/services/invoice.service";
import { listAgencyTasksDueSoon } from "@/features/agencies/services/agency-task.service";
import { getBrandPortalOverview } from "@/features/agencies/services/brand-portal.service";
import { BrandPortalView } from "@/features/agencies/components/brand-portal-view";
import { TaskPriorityBadge } from "@/features/agencies/components/crm-status-badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agency Dashboard" };

const REFERRAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending review",
  ACTIVE: "Connected",
  REJECTED: "Rejected",
  TRANSFERRED: "Transferred away",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function AgencyDashboardPage() {
  const actor = await requireCurrentMember();

  // Brand Contacts get a completely different, read-mostly view scoped to
  // their one brand — not the agency's own operational dashboard below.
  if (actor.role === "BRAND") {
    if (!actor.brandId) redirect("/dashboard");
    const overview = await getBrandPortalOverview(actor.organizationId, actor.brandId);
    if (!overview.brand) redirect("/dashboard");
    return <BrandPortalView overview={overview} />;
  }

  // Self-service only for now — an agency (or a team member who joined an
  // existing one via the Existing Agency Claim Workflow) sees their own
  // dashboard. Admin visibility into any agency's dashboard is a natural
  // follow-up but out of scope here (they already have this data via
  // /members/[id] and the GMV leaderboards).
  if (actor.role !== "AGENCY") redirect("/dashboard");

  // A team member "inherits the agency's existing Agency ID" — every query
  // below runs against the canonical agency's id, never the team member's
  // own. actor.agencyId stays null until their AgencyAccessRequest is
  // approved (see approveAgencyAccessRequest).
  const effectiveAgencyId = actor.agencyId ?? actor.id;
  const isCanonical = effectiveAgencyId === actor.id;

  // Still waiting on the target agency's own admins to review — show a
  // waiting state instead of the dashboard, and critically, never mint this
  // person their own Agency ID while a claim is outstanding.
  if (!actor.agencyId) {
    const ownRequest = await prisma.agencyAccessRequest.findUnique({
      where: { requesterId: actor.id },
      select: { status: true, agency: { select: { fullName: true } } },
    });
    if (ownRequest?.status === "PENDING") {
      return (
        <div className="space-y-6">
          <PageHeader title="Agency Dashboard" description="Your access request is under review." />
          <EmptyState
            icon={Clock}
            title={`Waiting on ${ownRequest.agency.fullName}`}
            description="Your request to join their team is pending approval. You'll be notified as soon as they respond."
          />
        </div>
      );
    }
  }

  // Self-healing backfill for agencies that existed before this feature —
  // "every agency receives a permanent unique Agency ID" holds even for
  // members created before referralCode existed, with no migration script.
  // Only for canonical/root agencies — a team member never mints their own.
  if (isCanonical && !actor.referralCode) {
    await ensureReferralCode(actor.id, actor.role);
  }
  // Same backfill for agencyRole — canonical agencies created before "Prevent
  // Orphaned Agencies" existed have no explicit Owner on record yet.
  // countActiveOwners already treats a null canonical role as an implicit
  // Owner, so this is belt-and-suspenders for clean data, not correctness.
  if (isCanonical && !actor.agencyRole) {
    await prisma.member.update({ where: { id: actor.id }, data: { agencyRole: "OWNER" } });
  }

  const canManageAgency = isAgencyAdmin(actor, effectiveAgencyId);

  const [
    data,
    referrals,
    requestStats,
    pendingRequests,
    team,
    pendingAccessRequests,
    brands,
    campaignStatusCounts,
    expiringContracts,
    allContracts,
    invoiceSummary,
    dueSoonTasks,
  ] = await Promise.all([
    getAgencyDashboardData(actor.organizationId, effectiveAgencyId),
    listReferralsForAgency(actor.organizationId, effectiveAgencyId),
    getAgencyRequestStats(actor.organizationId, effectiveAgencyId),
    getPendingRequestsForAgency(actor.organizationId, effectiveAgencyId),
    getAgencyTeam(actor.organizationId, effectiveAgencyId),
    canManageAgency ? getPendingAccessRequestsForAgency(actor.organizationId, effectiveAgencyId) : Promise.resolve([]),
    listBrandsForAgency(actor.organizationId, effectiveAgencyId),
    getCampaignStatusCounts(actor.organizationId, effectiveAgencyId),
    getExpiringContracts(actor.organizationId, effectiveAgencyId),
    listContracts(actor.organizationId, effectiveAgencyId),
    getInvoiceSummary(actor.organizationId, effectiveAgencyId),
    listAgencyTasksDueSoon(actor.organizationId, effectiveAgencyId),
  ]);

  if (!data) redirect("/dashboard");

  const activeCampaigns = campaignStatusCounts.ACTIVE ?? 0;
  const pendingCampaigns = campaignStatusCounts.PENDING_APPROVAL ?? 0;
  const contractsSigned = allContracts.filter((c) => c.status === "SIGNED").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agency Dashboard"
        description="Your Agency ID, referral QR code, and everything it has generated."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/agency/team"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Users2 className="size-4" />
              Team
            </Link>
            {canManageAgency && (
              <Link
                href="/agency/settings"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Settings2 className="size-4" />
                Settings
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { href: "/agency/creators", label: "Creators", icon: Users, value: String(data.connectedCreators.length) },
          { href: "/agency/brands", label: "Brands", icon: Briefcase, value: String(brands.length) },
          { href: "/agency/campaigns", label: "Campaigns", icon: Megaphone, value: String(activeCampaigns) },
          { href: "/agency/contracts", label: "Contracts", icon: FileSignature, value: String(contractsSigned) },
          { href: "/agency/files", label: "Files", icon: FolderOpen, value: "" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-2.5">
              <item.icon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {item.value && <span className="text-sm font-semibold tabular-nums text-muted-foreground">{item.value}</span>}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {data.referralCode ? (
            <AgencyReferralCard referralCode={data.referralCode} />
          ) : (
            <Card className="border shadow-sm">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Your Agency ID is being generated — refresh in a moment.
              </CardContent>
            </Card>
          )}
          <AgencyTeamCard team={team} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Creators Connected" value={String(data.connectedCreators.length)} icon={Users} />
            <StatCard
              label="Pending Creator Requests"
              value={String(data.pendingCreatorRequests)}
              icon={Clock}
              accent={data.pendingCreatorRequests > 0 ? "warning" : "default"}
            />
            <StatCard
              label="Lifetime GMV"
              value={formatCompactCurrency(data.lifetimeGMV)}
              icon={DollarSign}
              accent="success"
            />
            <StatCard label="Monthly GMV" value={formatCompactCurrency(data.monthlyGMV)} icon={TrendingUp} />
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">Top Performing Creator</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topPerformingCreator ? (
                <Link
                  href={`/members/${data.topPerformingCreator.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                >
                  <span className="text-sm font-medium">{data.topPerformingCreator.fullName}</span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCompactCurrency(data.topPerformingCreator.currentGMV)}
                  </span>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No connected creators yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Revenue</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">{pendingCampaigns} campaign(s) pending approval</span>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <StatCard label="Invoiced (Paid)" value={formatCompactCurrency(invoiceSummary.paidTotal)} icon={DollarSign} accent="success" />
            <StatCard
              label="Outstanding"
              value={formatCompactCurrency(invoiceSummary.outstandingTotal)}
              icon={Clock}
              accent={invoiceSummary.outstandingTotal > 0 ? "warning" : "default"}
            />
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSignature className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Contracts Expiring Soon</CardTitle>
            </div>
            <Link href="/agency/contracts" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              View all <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {expiringContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contracts expiring in the next 30 days.</p>
            ) : (
              <ul className="space-y-2">
                {expiringContracts.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm">
                    <span className="font-medium">{c.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.expiresAt ? format(c.expiresAt, "MMM d, yyyy") : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Open Tasks</h2>
          <Link href="/agency/campaigns" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            View campaigns <ArrowRight className="size-3" />
          </Link>
        </div>
        {dueSoonTasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="No open tasks" description="Tasks created inside a campaign will show up here, soonest due date first." />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dueSoonTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-sm font-medium">{task.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.campaign ? (
                        <Link href={`/agency/campaigns/${task.campaign.id}`} className="hover:underline">
                          {task.campaign.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <TaskPriorityBadge priority={task.priority} />
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {canManageAgency && (
        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Pending Access Requests</h2>
          <PendingAccessRequestsCard requests={pendingAccessRequests} />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Pending Requests</h2>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Pending Requests"
            value={String(requestStats.pending)}
            icon={Clock}
            accent={requestStats.pending > 0 ? "warning" : "default"}
          />
          <StatCard label="Approved This Month" value={String(requestStats.approvedThisMonth)} icon={Users} accent="success" />
          <StatCard label="Rejected This Month" value={String(requestStats.rejectedThisMonth)} icon={Users} />
        </div>
        <PendingRequestsCard requests={pendingRequests} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Connected Creators</h2>
        {data.connectedCreators.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No creators connected yet"
            description="Share your Agency ID or QR code — creators who apply with it will appear here once approved."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected Since</TableHead>
                  <TableHead className="text-right">GMV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.connectedCreators.map((creator) => (
                  <TableRow key={creator.id}>
                    <TableCell>
                      <Link href={`/members/${creator.id}`} className="flex items-center gap-3">
                        <Avatar className="size-8">
                          {creator.profilePhotoUrl && <AvatarImage src={creator.profilePhotoUrl} alt={creator.fullName} />}
                          <AvatarFallback className="text-xs">{initials(creator.fullName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{creator.fullName}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{creator.status}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(creator.memberSince, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatCompactCurrency(creator.currentGMV)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Referral Activity</h2>
        {referrals.length === 0 ? (
          <EmptyState icon={Clock} title="No referral activity yet" description="Every application submitted with your Agency ID will show up here." />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Referred</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.application?.fullName ?? r.member?.fullName ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.source.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(r.referredAt, "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{REFERRAL_STATUS_LABELS[r.status] ?? r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
