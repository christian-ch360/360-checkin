import Link from "next/link";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listCollabMembers, listAllSkills, type CollabSortKey } from "@/features/collab-hub/services/collab-hub.service";
import { listCollabPosts } from "@/features/collab-hub/services/collab-post.service";
import { CollabMemberCard } from "@/features/collab-hub/components/collab-member-card";
import { CollabFilters } from "@/features/collab-hub/components/collab-filters";
import { CollabFeedCard } from "@/features/collab-hub/components/collab-feed-card";
import { CollabPostFormDialog } from "@/features/collab-hub/components/collab-post-form";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isDemoModeActive, demoListCollabPosts, demoListCollabMembers, demoListAllSkills } from "@/features/demo-data";
import type { MemberRole, ContentCategory, SocialPlatform } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Community" };

export default async function CollabHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    search?: string;
    role?: string;
    skill?: string;
    category?: string;
    available?: string;
    platforms?: string;
    minFollowers?: string;
    verified?: string;
    recentlySynced?: string;
    location?: string;
    sort?: string;
  }>;
}) {
  const actor = await requireCurrentMember();
  const params = await searchParams;
  const view = params.view === "directory" ? "directory" : "feed";
  const isDemo = isDemoModeActive(actor);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Community</h1>
          <p className="text-sm text-muted-foreground">
            Post what you&apos;re looking to create, or find creators to team up with.
          </p>
        </div>
        {view === "feed" && <CollabPostFormDialog />}
      </div>

      <div className="flex items-center gap-1.5 border-b">
        <Link
          href="/collab-hub?view=feed"
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            view === "feed" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Feed
        </Link>
        <Link
          href="/collab-hub?view=directory"
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            view === "directory" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Directory
        </Link>
      </div>

      {view === "feed" ? (
        <FeedView organizationId={actor.organizationId} currentMemberId={actor.id} isDemo={isDemo} />
      ) : (
        <DirectoryView organizationId={actor.organizationId} params={params} isDemo={isDemo} />
      )}
    </div>
  );
}

async function FeedView({
  organizationId,
  currentMemberId,
  isDemo,
}: {
  organizationId: string;
  currentMemberId: string;
  isDemo: boolean;
}) {
  const posts = isDemo ? demoListCollabPosts({}) : await listCollabPosts(organizationId, {}, currentMemberId);

  if (posts.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No open collaborations right now. Be the first to post one.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <CollabFeedCard key={post.id} post={post} currentMemberId={currentMemberId} />
      ))}
    </div>
  );
}

async function DirectoryView({
  organizationId,
  params,
  isDemo,
}: {
  organizationId: string;
  params: {
    search?: string;
    role?: string;
    skill?: string;
    category?: string;
    available?: string;
    platforms?: string;
    minFollowers?: string;
    verified?: string;
    recentlySynced?: string;
    location?: string;
    sort?: string;
  };
  isDemo: boolean;
}) {
  const memberFilters = {
    search: params.search,
    role: params.role as MemberRole | undefined,
    skill: params.skill,
    category: params.category as ContentCategory | undefined,
    availableOnly: params.available === "1",
    platforms: params.platforms ? (params.platforms.split(",") as SocialPlatform[]) : undefined,
    minFollowers: params.minFollowers ? Number(params.minFollowers) : undefined,
    verifiedOnly: params.verified === "1",
    recentlySyncedOnly: params.recentlySynced === "1",
    location: params.location,
    sort: params.sort as CollabSortKey | undefined,
  };

  // listCollabMembers already attaches each member's socialSummary from one
  // cached, org-wide aggregate query — no second social-data fetch needed
  // here. Demo mode has no real SocialConnection rows, so its fixture
  // members carry an empty summary (same effectively-harmless outcome the
  // batched query used to produce for demo IDs).
  const [members, skills] = isDemo
    ? [demoListCollabMembers(memberFilters), demoListAllSkills()]
    : await Promise.all([listCollabMembers(organizationId, memberFilters), listAllSkills(organizationId)]);

  return (
    <div className="space-y-8">
      <CollabFilters skills={skills} />

      {members.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No members match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <CollabMemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
