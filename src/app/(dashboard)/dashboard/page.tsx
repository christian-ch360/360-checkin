import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getMemberNextBooking } from "@/features/spaces/services/spaces.service";
import { getOpenCheckIn } from "@/features/checkin/services/checkin.service";
import { getNotificationsSummary } from "@/lib/notifications";
import { listCollabPosts } from "@/features/collab-hub/services/collab-post.service";
import { listUpcomingEvents } from "@/features/events/services/events.service";
import { HomeGreeting } from "@/features/dashboard/components/home-greeting";
import { HomeCheckinStatus } from "@/features/dashboard/components/home-checkin-status";
import { HomeNextBooking } from "@/features/dashboard/components/home-next-booking";
import { HomeNotificationsSummary } from "@/features/dashboard/components/home-notifications-summary";
import { HomeQuickActions } from "@/features/dashboard/components/home-quick-actions";
import { HomeCommunityFeedPreview } from "@/features/dashboard/components/home-community-feed-preview";
import { HomeUpcomingEvents } from "@/features/dashboard/components/home-upcoming-events";
import { isDemoModeActive, demoGetNotificationsSummary, demoListCollabPosts, demoListUpcomingEvents } from "@/features/demo-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const member = await requireCurrentMember();
  const organizationId = member.organizationId;

  const isDemo = isDemoModeActive(member);

  const [nextBooking, openCheckIn, notifications, communityPosts, upcomingEvents] = await Promise.all([
    getMemberNextBooking(member.id),
    getOpenCheckIn(member.id),
    isDemo ? Promise.resolve(demoGetNotificationsSummary()) : getNotificationsSummary(member.id),
    isDemo ? Promise.resolve(demoListCollabPosts({})) : listCollabPosts(organizationId, {}, member.id),
    isDemo ? Promise.resolve(demoListUpcomingEvents(3)) : listUpcomingEvents(organizationId, 3),
  ]);

  return (
    <div className="space-y-8">
      <HomeGreeting firstName={member.fullName.split(" ")[0]} />

      <div className="grid gap-4 sm:grid-cols-3">
        <HomeCheckinStatus checkedIn={!!openCheckIn} />
        <HomeNextBooking booking={nextBooking} />
        <HomeNotificationsSummary summary={notifications} />
      </div>

      <HomeQuickActions />

      <div className="grid gap-4 lg:grid-cols-2">
        <HomeCommunityFeedPreview posts={communityPosts.slice(0, 3)} />
        <HomeUpcomingEvents events={upcomingEvents.map((e) => ({ id: e.id, title: e.title, startTime: e.startTime }))} />
      </div>
    </div>
  );
}
