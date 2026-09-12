import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getMemberNextBooking } from "@/features/spaces/services/spaces.service";
import { getOpenCheckIn } from "@/features/checkin/services/checkin.service";
import { getNotificationsSummary } from "@/lib/notifications";
import { listCollabPosts } from "@/features/collab-hub/services/collab-post.service";
import { listUpcomingEvents } from "@/features/events/services/events.service";
import { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";
import { calculateProfileCompletion } from "@/features/settings/lib/profile-completion";
import { getMemberMembershipSummary } from "@/features/creator-dashboard/services/membership.service";
import { requiresMembership } from "@/features/membership-plans/config/billing-config";
import { HomeGreeting } from "@/features/dashboard/components/home-greeting";
import { HomeCheckinStatus } from "@/features/dashboard/components/home-checkin-status";
import { HomeNextBooking } from "@/features/dashboard/components/home-next-booking";
import { HomeNotificationsSummary } from "@/features/dashboard/components/home-notifications-summary";
import { HomeQuickActions } from "@/features/dashboard/components/home-quick-actions";
import { HomeCommunityFeedPreview } from "@/features/dashboard/components/home-community-feed-preview";
import { HomeUpcomingEvents } from "@/features/dashboard/components/home-upcoming-events";
import { HomeProfileCompletion } from "@/features/dashboard/components/home-profile-completion";
import { HomeAudienceSnapshot } from "@/features/dashboard/components/home-audience-snapshot";
import { HomeMembershipStatus } from "@/features/dashboard/components/home-membership-status";
import { isDemoModeActive, demoGetNotificationsSummary, demoListCollabPosts, demoListUpcomingEvents } from "@/features/demo-data";

// Labels shown in the Home profile-completion card's "Missing: ..." line —
// same 9 checks calculateProfileCompletion scores, just named for display.
// Kept next to the page that renders them rather than in the shared
// lib/profile-completion.ts, since that file is deliberately just the pure
// scoring function (reused as-is by Settings → Profile's live completion bar).
const COMPLETION_CHECK_LABELS = [
  { key: "profilePhotoUrl", label: "Profile photo" },
  { key: "bio", label: "Bio" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "contentCategoriesCount", label: "Content Categories" },
  { key: "skillsCount", label: "Skills" },
  { key: "hasSocialLink", label: "A social link" },
  { key: "hasConnectedPlatform", label: "A connected account" },
] as const;

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const member = await requireCurrentMember();
  const organizationId = member.organizationId;

  const isDemo = isDemoModeActive(member);
  const needsMembership = requiresMembership(member.role);

  const [nextBooking, openCheckIn, notifications, communityPosts, upcomingEvents, connections, membership] = await Promise.all([
    getMemberNextBooking(member.id),
    getOpenCheckIn(member.id),
    isDemo ? Promise.resolve(demoGetNotificationsSummary()) : getNotificationsSummary(member.id),
    isDemo ? Promise.resolve(demoListCollabPosts({})) : listCollabPosts(organizationId, {}, member.id),
    isDemo ? Promise.resolve(demoListUpcomingEvents(3)) : listUpcomingEvents(organizationId, 3),
    getConnectionsForMember(member.id),
    // Only roles that actually require a membership plan have a
    // MemberSubscription row at all (see requiresMembership) — skip the
    // query entirely for everyone else rather than fetching a guaranteed null.
    needsMembership ? getMemberMembershipSummary(member.id) : Promise.resolve(null),
  ]);

  const hasConnectedPlatform = connections.some((c) => c.status === "CONNECTED");
  const hasSocialLink = Boolean(member.instagramUrl || member.tiktokUrl || member.youtubeUrl || member.linkedinUrl);
  const completionInput = {
    profilePhotoUrl: member.profilePhotoUrl,
    bio: member.bio,
    website: member.website,
    phone: member.phone,
    location: member.location,
    contentCategoriesCount: member.contentCategories.length,
    skillsCount: member.skills.length,
    hasSocialLink,
    hasConnectedPlatform,
  };
  const completionPercent = calculateProfileCompletion(completionInput);
  const missing = COMPLETION_CHECK_LABELS.filter(({ key }) => {
    const value = completionInput[key];
    return typeof value === "number" ? value === 0 : !value;
  }).map(({ label }) => label);

  return (
    <div className="space-y-8">
      <HomeGreeting firstName={member.fullName.split(" ")[0]} />

      <HomeProfileCompletion percent={completionPercent} missing={missing} />

      <HomeAudienceSnapshot connections={connections} />

      <div className="grid gap-4 sm:grid-cols-3">
        <HomeCheckinStatus checkedIn={!!openCheckIn} />
        <HomeNextBooking booking={nextBooking} />
        <HomeNotificationsSummary summary={notifications} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HomeCommunityFeedPreview posts={communityPosts.slice(0, 3)} />
        <HomeUpcomingEvents events={upcomingEvents.map((e) => ({ id: e.id, title: e.title, startTime: e.startTime }))} />
      </div>

      {needsMembership && <HomeMembershipStatus membership={membership} memberSince={member.memberSince} />}

      <HomeQuickActions />
    </div>
  );
}
