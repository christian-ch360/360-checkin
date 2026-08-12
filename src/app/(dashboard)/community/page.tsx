import Link from "next/link";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { listCommunityPosts, type CommunityFeedFilter } from "@/features/community/services/community-post.service";
import { listPendingCommunityReports } from "@/features/community/services/community-moderation-actions";
import { listTrendingHashtags } from "@/features/community/services/hashtag.service";
import { CommunityPostComposer } from "@/features/community/components/community-post-composer";
import { CommunityPostCard } from "@/features/community/components/community-post-card";
import { CommunitySearchBar } from "@/features/community/components/community-search-bar";
import { ReportedPostsPanel } from "@/features/community/components/reported-posts-panel";
import { HashtagChip } from "@/features/community/components/hashtag-chip";
import { SuspendMemberControl } from "@/features/community/components/suspend-member-control";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Community" };

const TABS: { value: CommunityFeedFilter; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "following", label: "Following" },
  { value: "my-posts", label: "My Posts" },
  { value: "pinned", label: "Pinned" },
  { value: "announcements", label: "Announcements" },
];

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; hashtag?: string }>;
}) {
  const actor = await requireCurrentMember();
  const { filter: filterParam, hashtag } = await searchParams;
  const filter: CommunityFeedFilter = TABS.some((t) => t.value === filterParam)
    ? (filterParam as CommunityFeedFilter)
    : "newest";

  const canModerate = hasPermission(actor.systemRole, "community.moderate");
  const canSuspend = hasPermission(actor.systemRole, "community.suspend");

  const [posts, trendingHashtags, reports] = await Promise.all([
    listCommunityPosts(actor.organizationId, actor.id, { filter, hashtag }),
    listTrendingHashtags(actor.organizationId),
    canModerate ? listPendingCommunityReports(actor.organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CommunitySearchBar />
      </div>

      {canModerate && reports.length > 0 && <ReportedPostsPanel reports={reports} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <CommunityPostComposer
            authorName={actor.fullName}
            authorPhotoUrl={actor.profilePhotoUrl}
            canAnnounce={canModerate}
          />

          <div className="flex flex-wrap items-center gap-1.5 border-b">
            {TABS.map((tab) => (
              <Link
                key={tab.value}
                href={`/community?filter=${tab.value}${hashtag ? `&hashtag=${hashtag}` : ""}`}
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  filter === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {hashtag && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Filtering by <HashtagChip tag={hashtag} />
              <Link href={`/community?filter=${filter}`} className="text-xs underline">
                Clear
              </Link>
            </div>
          )}

          {posts.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {filter === "my-posts"
                  ? "You haven't posted yet."
                  : filter === "following"
                    ? "Follow other members to see their posts here."
                    : filter === "pinned"
                      ? "No pinned posts right now."
                      : "Nothing here yet — be the first to post."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  currentMemberId={actor.id}
                  canModerate={canModerate}
                  initialReactions={post.reactions}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium">Trending hashtags</p>
              {trendingHashtags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hashtags trending yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {trendingHashtags.map((h) => (
                    <HashtagChip key={h.id} tag={h.tag} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {canSuspend && (
            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="text-sm font-medium">Suspend a member</p>
                <SuspendMemberControl />
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
