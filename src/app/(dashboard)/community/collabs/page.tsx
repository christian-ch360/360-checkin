import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listCollabPosts } from "@/features/collab-hub/services/collab-post.service";
import { CollabFeedCard } from "@/features/collab-hub/components/collab-feed-card";
import { CollabPostFormDialog } from "@/features/collab-hub/components/collab-post-form";
import { Card, CardContent } from "@/components/ui/card";
import { isDemoModeActive, demoListCollabPosts } from "@/features/demo-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Collabs · Community" };

export default async function CommunityCollabsPage() {
  const actor = await requireCurrentMember();
  const isDemo = isDemoModeActive(actor);
  const posts = isDemo ? demoListCollabPosts({}) : await listCollabPosts(actor.organizationId, {}, actor.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Post what you&apos;re looking to create, or find creators to team up with.
        </p>
        <CollabPostFormDialog />
      </div>

      {posts.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No open collaborations right now. Be the first to post one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <CollabFeedCard key={post.id} post={post} currentMemberId={actor.id} />
          ))}
        </div>
      )}
    </div>
  );
}
