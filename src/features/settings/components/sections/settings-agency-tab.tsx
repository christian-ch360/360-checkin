import Link from "next/link";
import { Users, Clock, DollarSign, TrendingUp, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";
import { AgencySection } from "@/features/settings/components/sections/agency-section";
import { AgencyReferralCard } from "@/features/referrals/components/agency-referral-card";
import { AgencyTeamCard } from "@/features/agencies/components/agency-team-card";
import { InviteTeamMemberDialog } from "@/features/agencies/components/invite-team-member-dialog";
import { formatCompactCurrency } from "@/lib/utils/format";
import type { CreatorAgencyStatus, AgencyDashboardData } from "@/features/referrals/services/referral.service";
import type { AgencyTeamMember } from "@/features/agencies/services/agency-access.service";
import type { AgencyMemberRole } from "@prisma/client";

const AGENCY_ROLE_LABELS: Record<AgencyMemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
};

/**
 * Role-adaptive: a Creator sees the existing "connect to an agency"
 * flow (AgencySection, unchanged); an Agency-role member sees a compact
 * summary of their own agency — Agency ID, role, pending requests, team,
 * creator count, and GMV — with an Invite action and links out to the
 * full /agency dashboard rather than re-duplicating its 300 lines here.
 */
export function SettingsAgencyTab({
  isAgency,
  creatorStatus,
  agencyData,
  agencyRole,
  team,
  canManageAgency,
}: {
  isAgency: boolean;
  creatorStatus: CreatorAgencyStatus | null;
  agencyData: AgencyDashboardData | null;
  agencyRole: AgencyMemberRole | null;
  team: AgencyTeamMember[];
  canManageAgency: boolean;
}) {
  if (!isAgency) {
    return creatorStatus ? <AgencySection status={creatorStatus} /> : null;
  }

  if (!agencyData) return null;

  return (
    <SettingsSectionCard
      title="Agency"
      description="Your Agency ID, team, and everything it has generated."
      action={
        <Link href="/agency" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Full dashboard <ArrowRight className="size-3.5" />
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {agencyData.referralCode && <AgencyReferralCard referralCode={agencyData.referralCode} />}
            <div className="flex items-center justify-between rounded-xl border p-4">
              <span className="text-sm text-muted-foreground">Your role</span>
              <Badge variant="outline">{agencyRole ? AGENCY_ROLE_LABELS[agencyRole] : "Owner"}</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Creator Count" value={String(agencyData.connectedCreators.length)} icon={Users} />
              <StatCard
                label="Pending Requests"
                value={String(agencyData.pendingCreatorRequests)}
                icon={Clock}
                accent={agencyData.pendingCreatorRequests > 0 ? "warning" : "default"}
              />
              <StatCard label="Lifetime GMV" value={formatCompactCurrency(agencyData.lifetimeGMV)} icon={DollarSign} accent="success" />
              <StatCard label="Monthly GMV" value={formatCompactCurrency(agencyData.monthlyGMV)} icon={TrendingUp} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Team Members</p>
            {canManageAgency && <InviteTeamMemberDialog actorRole={agencyRole} />}
          </div>
          <AgencyTeamCard team={team} />
        </div>
      </div>
    </SettingsSectionCard>
  );
}
