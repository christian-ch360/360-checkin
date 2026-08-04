import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { PageHeader } from "@/components/shared/page-header";
import { getAgencyTeam, isAgencyAdmin } from "@/features/agencies/services/agency-access.service";
import { listAgencyInvitations } from "@/features/agencies/services/agency-invitations.service";
import { getAgencyActivity } from "@/features/agencies/services/agency-activity.service";
import { TeamRosterCard } from "@/features/agencies/components/team-roster-card";
import { InviteTeamMemberDialog } from "@/features/agencies/components/invite-team-member-dialog";
import { PendingInvitationsCard } from "@/features/agencies/components/pending-invitations-card";
import { TeamActivityFeed } from "@/features/agencies/components/team-activity-feed";

export const dynamic = "force-dynamic";

export const metadata = { title: "Team Management" };

export default async function AgencyTeamPage() {
  const actor = await requireCurrentMember();
  if (actor.role !== "AGENCY") redirect("/dashboard");
  if (!actor.agencyId && !actor.referralCode) redirect("/agency");

  const effectiveAgencyId = actor.agencyId ?? actor.id;
  const canManageAgency = isAgencyAdmin(actor, effectiveAgencyId);

  const [team, invitations, activity] = await Promise.all([
    getAgencyTeam(actor.organizationId, effectiveAgencyId),
    canManageAgency ? listAgencyInvitations(actor.organizationId, effectiveAgencyId) : Promise.resolve([]),
    getAgencyActivity(actor.organizationId, effectiveAgencyId, "all"),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team Management"
        description="Manage who has access to your agency, their roles, and ownership."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/agency"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
              Agency Dashboard
            </Link>
            {canManageAgency && <InviteTeamMemberDialog actorRole={actor.agencyRole} />}
          </div>
        }
      />

      <TeamRosterCard team={team} currentMemberId={actor.id} actorRole={actor.agencyRole} />

      {canManageAgency && <PendingInvitationsCard invitations={invitations} />}

      <TeamActivityFeed initialEntries={activity} />
    </div>
  );
}
