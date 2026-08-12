import Link from "next/link";
import { ArrowRight, Handshake } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export type HomeCommunityPost = {
  id: string;
  title: string;
  member: { fullName: string; profilePhotoUrl: string | null };
};

export function HomeCommunityFeedPreview({ posts }: { posts: HomeCommunityPost[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Collabs</CardTitle>
        <Link href="/community/collabs" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View all <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {posts.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Handshake className="size-4" /> No open collaborations right now.
          </p>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/community/collabs/${post.id}`}
              className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/50"
            >
              <Avatar className="size-8">
                {post.member.profilePhotoUrl && <AvatarImage src={post.member.profilePhotoUrl} />}
                <AvatarFallback>{initials(post.member.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{post.title}</p>
                <p className="truncate text-xs text-muted-foreground">{post.member.fullName}</p>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
