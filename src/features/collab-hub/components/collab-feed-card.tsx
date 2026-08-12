"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { MessageCircle, CheckCircle2, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applyToPost } from "@/features/collab-hub/services/application-actions";
import { startConversation } from "@/features/collab-hub/services/conversation-actions";
import { toggleCollabPostLike } from "@/features/collab-hub/services/like-actions";
import { cn } from "@/lib/utils";

const BUDGET_LABELS: Record<string, string> = { PAID: "Paid", TRADE: "Trade", FREE: "Free" };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export type CollabFeedPost = {
  id: string;
  title: string;
  description: string;
  budgetType: string;
  budgetNote: string | null;
  createdAt: Date;
  hasApplied: boolean;
  hasLiked: boolean;
  member: {
    id: string;
    fullName: string;
    profilePhotoUrl: string | null;
    role: string;
    company: { name: string } | null;
  };
  _count: { applications: number; likes: number };
};

export function CollabFeedCard({ post, currentMemberId }: { post: CollabFeedPost; currentMemberId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(post.hasLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const isOwnPost = post.member.id === currentMemberId;

  function handleLike() {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    startTransition(async () => {
      const result = await toggleCollabPostLike(post.id);
      if (!result.success) {
        toast.error(result.error);
        setLiked((prev) => !prev);
        setLikeCount((prev) => (liked ? prev + 1 : prev - 1));
      }
    });
  }

  function handleApply() {
    startTransition(async () => {
      const result = await applyToPost(post.id, {});
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Application sent");
      router.refresh();
    });
  }

  function handleMessage() {
    startTransition(async () => {
      const result = await startConversation(post.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push(`/messages/${result.conversationId}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/community/collabs/${post.id}`} className="flex items-center gap-3">
        <Avatar className="size-10">
          {post.member.profilePhotoUrl && <AvatarImage src={post.member.profilePhotoUrl} />}
          <AvatarFallback>{initials(post.member.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{post.member.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {post.member.company?.name ?? post.member.role}
          </p>
        </div>
      </Link>

      <Link href={`/community/collabs/${post.id}`} className="block">
        <p className="font-semibold">{post.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
      </Link>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{BUDGET_LABELS[post.budgetType]}</Badge>
          {post.budgetNote && <span>{post.budgetNote}</span>}
        </div>
        <span>{formatDistanceToNowStrict(post.createdAt, { addSuffix: true })}</span>
      </div>

      <div className="flex items-center gap-1 border-t pt-3">
        <button
          type="button"
          onClick={handleLike}
          disabled={isPending}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors hover:bg-muted",
            liked ? "text-destructive" : "text-muted-foreground"
          )}
        >
          <Heart className={cn("size-3.5", liked && "fill-current")} />
          {likeCount > 0 ? likeCount : "Like"}
        </button>
      </div>

      {!isOwnPost && (
        <div className="flex gap-2 border-t pt-3">
          {post.hasApplied ? (
            <Badge variant="outline" className="flex flex-1 items-center justify-center gap-1 py-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" /> Applied
            </Badge>
          ) : (
            <Button size="sm" className="flex-1" onClick={handleApply} disabled={isPending}>
              Apply
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1" onClick={handleMessage} disabled={isPending}>
            <MessageCircle className="size-3.5" /> Message
          </Button>
        </div>
      )}
    </div>
  );
}
