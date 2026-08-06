import { requireCurrentMember } from "@/features/auth/services/current-member";
import { prisma } from "@/lib/db/prisma";
import { getMemberAttendanceStats } from "@/features/checkin/services/checkin.service";
import { getMemberSpaceTimeStats } from "@/features/locations/services/locations.service";
import { getMemberMembership } from "@/features/creator-dashboard/services/membership.service";
import { listSwitchablePlans } from "@/features/membership-plans/services/membership-plans.service";
import {
  getMoneyGeneratedHero,
  getRevenueBreakdownByChannel,
  getMonthlyRevenueSeries,
  getTopRevenueSources,
  getRevenueGoal,
} from "@/features/revenue/services/revenue.service";
import { listMyProjects } from "@/features/projects/services/projects.service";
import { listMyEvents } from "@/features/events/services/events.service";
import { listMyCollaborations } from "@/features/collab-hub/services/collab-post.service";
import { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";
import { getFollowerGrowthForMember } from "@/features/integrations/services/follower-growth.service";
import { getStoreConnectionsForMember } from "@/features/integrations/services/store-connections.service";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/features/creator-dashboard/components/profile-tab";
import { ActivityTab } from "@/features/creator-dashboard/components/activity-tab";
import { MembershipTab } from "@/features/creator-dashboard/components/membership-tab";
import { ProjectsTab } from "@/features/creator-dashboard/components/projects-tab";
import { EventsTab } from "@/features/creator-dashboard/components/events-tab";
import { CollaborationsTab } from "@/features/creator-dashboard/components/collaborations-tab";
import { IntegrationsTab } from "@/features/integrations/components/integrations-tab";
import { SUBSCRIPTION_STATUS_META } from "@/features/creator-dashboard/components/membership-tab";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const actor = await requireCurrentMember();
  const { tab } = await searchParams;

  const [
    member,
    attendanceStats,
    spaceTimeStats,
    membership,
    switchablePlans,
    moneyGeneratedHero,
    revenueBreakdown,
    monthlyRevenueSeries,
    topRevenueSources,
    revenueGoal,
    projects,
    events,
    collaborations,
    connections,
    storeConnections,
  ] = await Promise.all([
    prisma.member.findUniqueOrThrow({
      where: { id: actor.id },
      include: { company: { select: { id: true, name: true } } },
    }),
    getMemberAttendanceStats(actor.id),
    getMemberSpaceTimeStats(actor.id),
    getMemberMembership(actor.id),
    listSwitchablePlans(actor.organizationId, actor.role),
    getMoneyGeneratedHero(actor.id),
    getRevenueBreakdownByChannel(actor.id),
    getMonthlyRevenueSeries(actor.id),
    getTopRevenueSources(actor.id),
    getRevenueGoal(actor.id),
    listMyProjects(actor.id),
    listMyEvents(actor.id),
    listMyCollaborations(actor.id),
    getConnectionsForMember(actor.id),
    getStoreConnectionsForMember(actor.id),
  ]);

  const growth = await getFollowerGrowthForMember(
    actor.id,
    connections.map((c) => ({ platform: c.platform, followerCount: c.followerCount }))
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" description="Your identity, membership, and standing at CreatorHub360." />

      <Tabs defaultValue={tab === "integrations" ? "integrations" : "profile"}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="collaborations">Collaborations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab
            member={{
              id: member.id,
              profilePhotoUrl: member.profilePhotoUrl,
              bannerImageUrl: member.bannerImageUrl,
              fullName: member.fullName,
              username: member.username,
              displayName: member.displayName,
              role: member.role,
              bio: member.bio,
              location: member.location,
              website: member.website,
              company: member.company,
              followerCount: member.followerCount,
              platforms: member.platforms,
              verificationStatus: member.verificationStatus,
              skills: member.skills,
              contentCategories: member.contentCategories,
              availableForCollab: member.availableForCollab,
              visibleInDirectory: member.visibleInDirectory,
              lookingFor: member.lookingFor,
              instagramUrl: member.instagramUrl,
              tiktokUrl: member.tiktokUrl,
              youtubeUrl: member.youtubeUrl,
              linkedinUrl: member.linkedinUrl,
              memberSince: member.memberSince,
              phone: member.phone,
              email: member.email,
            }}
            membershipStatusLabel={membership ? SUBSCRIPTION_STATUS_META[membership.status].label : null}
            connections={connections}
            growth={growth}
          />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab connections={connections} storeConnections={storeConnections} />
        </TabsContent>

        <TabsContent value="membership">
          <MembershipTab
            membership={membership}
            switchablePlans={switchablePlans}
            moneyGeneratedHero={moneyGeneratedHero}
            revenueBreakdown={revenueBreakdown}
            monthlyRevenueSeries={monthlyRevenueSeries}
            topRevenueSources={topRevenueSources}
            revenueGoal={revenueGoal}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab
            totalHoursWorked={Number(member.hoursWorked)}
            attendanceStats={attendanceStats}
            spaceTimeStats={spaceTimeStats}
          />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectsTab projects={projects.map((p) => ({ ...p, gmv: Number(p.gmv) }))} />
        </TabsContent>

        <TabsContent value="events">
          <EventsTab events={events} />
        </TabsContent>

        <TabsContent value="collaborations">
          <CollaborationsTab collaborations={collaborations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
