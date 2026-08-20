import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { DollarSign, TrendingUp, Clock, Percent } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import {
  getMemberProfile,
  listCompaniesForOrg,
  listCommissionTiersForOrg,
} from "@/features/members/services/members.service";
import { getMemberAttendanceStats } from "@/features/checkin/services/checkin.service";
import { getMemberSpaceTimeStats } from "@/features/locations/services/locations.service";
import { LOCATION_TYPE_META } from "@/features/locations/components/location-occupancy-widget";
import { hasPermission } from "@/lib/permissions";
import { canEditMemberProfile } from "@/lib/permissions/member-rules";
import { StatCard } from "@/components/shared/stat-card";
import { MemberHeader } from "@/features/members/components/member-header";
import { MemberAttendanceTable } from "@/features/members/components/member-attendance-table";
import { MemberCommissionHistory } from "@/features/members/components/member-commission-history";
import { MemberProjectsList } from "@/features/members/components/member-projects-list";
import { MemberMembershipTab } from "@/features/members/components/member-membership-tab";
import { getCollabProfileStats } from "@/features/collab-hub/services/collab-profile.service";
import { CollabStatsPanel } from "@/features/collab-hub/components/collab-stats-panel";
import { MemberQrSection } from "@/features/qr/components/member-qr-section";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { MemberPermissionsCard } from "@/features/members/components/member-permissions-card";
import { SocialPresence } from "@/features/integrations/components/social-presence";
import { CreatorSocialSummary } from "@/features/integrations/components/creator-social-summary";
import { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";
import { getFollowerGrowthForMember } from "@/features/integrations/services/follower-growth.service";
import { ReferralTransferCard } from "@/features/referrals/components/referral-transfer-card";
import { ReferralCard } from "@/features/referrals/components/referral-card";
import { getMemberReferralStats } from "@/features/referrals/services/referral.service";
import { isReferralEligibleRole } from "@/features/referrals/config/referral-config";
import { AgencyMergeCard } from "@/features/agencies/components/agency-merge-card";
import { MemberNotesCard } from "@/features/members/components/member-notes-card";
import { MemberActivityLog } from "@/features/members/components/member-activity-log";
import { MemberDangerZone } from "@/features/members/components/member-danger-zone";
import { listMemberAuditLogs } from "@/features/admin/services/audit-log.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCompactCurrency, formatHours, formatDuration } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireCurrentMember();

  const profile = await getMemberProfile(actor.organizationId, id);
  if (!profile) notFound();

  const { member, checkIns, gmvTransactions, commissionTransactions } = profile;
  const canManage = hasPermission(actor.systemRole, "members.manage");
  const canManageRoles = hasPermission(actor.systemRole, "roles.manage");
  const canManageReferrals = hasPermission(actor.systemRole, "referrals.transfer");
  const canMergeAgencies = hasPermission(actor.systemRole, "agencies.merge");
  const canDeleteMembers = hasPermission(actor.systemRole, "members.delete");
  const canEditProfile = canManage && canEditMemberProfile(actor.systemRole, member.systemRole);
  const isSelf = actor.id === member.id;
  // QR codes are private: only the member themself or an Admin/Super Admin
  // may view another member's QR section on their profile.
  const canViewQr = isSelf || canManage;

  // Referral info is only ever shown to the member themselves or an
  // Admin/Super Admin — "Members must not see sensitive applicant info; the
  // referral system must not expose referral management to unauthorized
  // users."
  const canViewReferrals = (isSelf || canManage) && isReferralEligibleRole(member.role);

  const [
    companies,
    commissionTiers,
    collabStats,
    attendanceStats,
    spaceTimeStats,
    isFollowing,
    memberAuditLogs,
    socialConnections,
    referralStats,
  ] = await Promise.all([
    listCompaniesForOrg(actor.organizationId),
    listCommissionTiersForOrg(actor.organizationId),
    getCollabProfileStats(actor.organizationId, member.id),
    getMemberAttendanceStats(member.id),
    getMemberSpaceTimeStats(member.id),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: actor.id, followingId: member.id } } }).then(Boolean),
    canManage ? listMemberAuditLogs(actor.organizationId, member.id) : Promise.resolve([]),
    canManage ? getConnectionsForMember(member.id) : Promise.resolve([]),
    canViewReferrals ? getMemberReferralStats(actor.organizationId, member.id) : Promise.resolve(null),
  ]);

  const socialGrowth = canManage
    ? await getFollowerGrowthForMember(
        member.id,
        socialConnections.map((c) => ({ platform: c.platform, followerCount: c.followerCount }))
      )
    : {};

  // Every member gets a QR at creation time (ensureQRAsset is idempotent —
  // it never regenerates an existing token). This just self-heals any
  // legacy row that predates that guarantee. Only fetched/rendered for the
  // owner or an Admin/Super Admin — QR codes are private (see canViewQr).
  const qrAsset = canViewQr ? (member.qrAsset ?? (await ensureQRAsset({ type: "MEMBER", memberId: member.id }))) : null;

  return (
    <div className="space-y-8">
      {qrAsset && (
        <div className="lg:hidden">
          <MemberQrSection
            memberId={member.id}
            token={qrAsset.token}
            fullName={member.fullName}
            memberNumber={member.memberNumber}
            canManage={canManage}
            variant="mobile"
          />
        </div>
      )}

      <MemberHeader
        member={{
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          memberNumber: member.memberNumber,
          role: member.role,
          status: member.status,
          profilePhotoUrl: member.profilePhotoUrl,
          memberSince: member.memberSince.toISOString(),
          location: member.location,
          company: member.company ? { id: member.company.id, name: member.company.name } : null,
          commissionTier: member.commissionTier
            ? { code: member.commissionTier.code, percentage: member.commissionTier.percentage.toString() }
            : null,
          commissionTierId: member.commissionTierId,
          referralSource: member.referralSource,
          bio: member.bio,
          skills: member.skills,
          availableForCollab: member.availableForCollab,
          lookingFor: member.lookingFor,
          instagramUrl: member.instagramUrl,
          tiktokUrl: member.tiktokUrl,
          youtubeUrl: member.youtubeUrl,
          linkedinUrl: member.linkedinUrl,
        }}
        companies={companies}
        commissionTiers={commissionTiers.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          percentage: t.percentage.toString(),
        }))}
        canEdit={canEditProfile}
        canAssignAdminRoles={canManageRoles}
        currentMemberId={actor.id}
        isFollowing={isFollowing}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Current GMV" value={formatCompactCurrency(Number(member.currentGMV))} icon={TrendingUp} accent="success" />
        <StatCard label="Lifetime GMV" value={formatCompactCurrency(Number(member.lifetimeGMV))} icon={DollarSign} accent="primary" />
        <StatCard label="Current commission" value={formatCompactCurrency(Number(member.currentCommission))} icon={Percent} accent="warning" />
        <StatCard label="Hours worked" value={formatHours(Number(member.hoursWorked))} icon={Clock} />
      </div>

      {canManage && (
        <div className="space-y-4">
          <CreatorSocialSummary connections={socialConnections} />
          <SocialPresence connections={socialConnections} growth={socialGrowth} variant="admin" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="projects">
            <TabsList>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="commissions">Commission history</TabsTrigger>
              <TabsTrigger value="collabs">Collaborations</TabsTrigger>
              <TabsTrigger value="membership">Membership</TabsTrigger>
              {canManage && <TabsTrigger value="activity">Activity</TabsTrigger>}
            </TabsList>
            <TabsContent value="projects">
              <Card>
                <CardContent className="pt-6">
                  <MemberProjectsList
                    assignments={member.projectAssignments.map((a) => ({
                      id: a.id,
                      role: a.role,
                      commissionPct: a.commissionPct.toString(),
                      contributionPct: a.contributionPct.toString(),
                      hours: a.hours.toString(),
                      status: a.status,
                      project: {
                        id: a.project.id,
                        name: a.project.name,
                        status: a.project.status,
                        gmv: a.project.gmv.toString(),
                      },
                    }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="attendance" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Today's Visit"
                  value={attendanceStats.todayVisit ? format(attendanceStats.todayVisit.checkIn, "h:mm a") : "Not yet"}
                  icon={Clock}
                />
                <StatCard label="Total Visits" value={String(attendanceStats.totalVisits)} icon={TrendingUp} />
                <StatCard
                  label="Average Visit Length"
                  value={formatDuration(attendanceStats.averageMinutes)}
                  icon={Clock}
                />
                <StatCard
                  label="Longest Visit"
                  value={formatDuration(attendanceStats.longestMinutes)}
                  icon={Clock}
                  accent="success"
                />
                <StatCard
                  label="Last Visit"
                  value={attendanceStats.lastVisit ? format(attendanceStats.lastVisit.checkIn, "MMM d, yyyy") : "—"}
                  icon={Clock}
                />
                <StatCard
                  label="Current Status"
                  value={attendanceStats.isCurrentlyCheckedIn ? "🟢 Checked In" : "Checked Out"}
                  icon={Clock}
                  accent={attendanceStats.isCurrentlyCheckedIn ? "primary" : "default"}
                />
              </div>
              <Card>
                <CardContent className="pt-6">
                  <MemberAttendanceTable
                    checkIns={checkIns.map((c) => ({
                      id: c.id,
                      checkIn: c.checkIn,
                      checkOut: c.checkOut,
                      duration: c.duration,
                      status: c.status,
                    }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Work Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="Today's Hours" value={formatDuration(spaceTimeStats.todayMinutes)} icon={Clock} />
                    <StatCard label="Weekly Hours" value={formatDuration(spaceTimeStats.weeklyMinutes)} icon={Clock} />
                    <StatCard label="Monthly Hours" value={formatDuration(spaceTimeStats.monthlyMinutes)} icon={Clock} />
                    <StatCard
                      label="Avg Session Length"
                      value={formatDuration(spaceTimeStats.averageSessionMinutes)}
                      icon={Clock}
                    />
                  </div>
                  {Object.keys(spaceTimeStats.byLocationType).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Time by space</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {Object.entries(spaceTimeStats.byLocationType).map(([type, minutes]) => (
                          <div key={type} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                            <span className="text-muted-foreground">
                              {LOCATION_TYPE_META[type as keyof typeof LOCATION_TYPE_META]?.label ?? type}
                            </span>
                            <span className="font-medium">{formatDuration(minutes)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="commissions">
              <Card>
                <CardContent className="pt-6">
                  <MemberCommissionHistory
                    transactions={commissionTransactions.map((t) => ({
                      id: t.id,
                      tierCode: t.tierCode,
                      percentage: t.percentage.toString(),
                      gmvAmount: t.gmvAmount.toString(),
                      commissionAmount: t.commissionAmount.toString(),
                      status: t.status,
                      createdAt: t.createdAt,
                      project: t.project ? { name: t.project.name } : null,
                    }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="collabs">
              <CollabStatsPanel stats={collabStats} />
            </TabsContent>
            <TabsContent value="membership">
              <MemberMembershipTab
                subscription={
                  member.subscription
                    ? {
                        id: member.subscription.id,
                        status: member.subscription.status,
                        startedAt: member.subscription.startedAt,
                        trialEndsAt: member.subscription.trialEndsAt,
                        currentPeriodEnd: member.subscription.currentPeriodEnd,
                        cancelAt: member.subscription.cancelAt,
                        stripeCustomerId: member.subscription.paymentProviderCustomerId,
                        stripeSubscriptionId: member.subscription.externalSubscriptionId,
                        plan: { name: member.subscription.plan.name, priceCents: member.subscription.plan.priceCents },
                        payments: member.subscription.payments.map((p) => ({
                          id: p.id,
                          amountCents: p.amountCents,
                          status: p.status,
                          paidAt: p.paidAt,
                          note: p.note,
                        })),
                      }
                    : null
                }
                canManage={hasPermission(actor.systemRole, "billing.manage")}
              />
            </TabsContent>
            {canManage && (
              <TabsContent value="activity">
                <Card>
                  <CardContent className="pt-6">
                    <MemberActivityLog entries={memberAuditLogs} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-4">
          {qrAsset && (
            <div className="hidden lg:block">
              <MemberQrSection
                memberId={member.id}
                token={qrAsset.token}
                fullName={member.fullName}
                memberNumber={member.memberNumber}
                canManage={canManage}
                variant="desktop"
              />
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Recent GMV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {gmvTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No GMV recorded yet.</p>
              ) : (
                gmvTransactions.slice(0, 8).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">
                      {t.project?.name ?? t.description ?? "GMV entry"}
                    </span>
                    <span className="shrink-0 font-medium">{formatCompactCurrency(Number(t.amount))}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {canManage && (
            <MemberPermissionsCard
              member={{ id: member.id, fullName: member.fullName, systemRole: member.systemRole }}
              canManageRoles={canManageRoles}
              isSelf={isSelf}
            />
          )}

          {referralStats && <ReferralCard stats={referralStats} />}

          {canManage && (
            <ReferralTransferCard
              member={{ id: member.id, fullName: member.fullName }}
              currentAgency={member.referredBy}
              canTransfer={canManageReferrals}
            />
          )}

          {member.role === "AGENCY" && canMergeAgencies && (
            <AgencyMergeCard agency={{ id: member.id, fullName: member.fullName, referralCode: member.referralCode }} />
          )}

          {canManage && (
            <MemberNotesCard
              memberId={member.id}
              notes={member.notesReceived.map((note) => ({
                id: note.id,
                body: note.body,
                createdAt: note.createdAt.toISOString(),
                author: { fullName: note.author.fullName },
              }))}
            />
          )}

          {canDeleteMembers && !isSelf && (
            <MemberDangerZone memberId={member.id} fullName={member.fullName} />
          )}
        </div>
      </div>
    </div>
  );
}
