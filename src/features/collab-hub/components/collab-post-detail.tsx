"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { applyToPost } from "@/features/collab-hub/services/application-actions";
import { startConversation } from "@/features/collab-hub/services/conversation-actions";
import { updateCollabPostStatus } from "@/features/collab-hub/services/collab-post-actions";
import { toggleCollabPostLike } from "@/features/collab-hub/services/like-actions";
import { addCollabPostComment } from "@/features/collab-hub/services/comment-actions";
import { ApplicationsPanel } from "@/features/collab-hub/components/applications-panel";
import { CheckCircle2, MessageCircle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";

const CATEGORY_LABELS: Record<string, string> = {
  CREATOR: "Creator",
  BRAND: "Brand",
  AGENCY: "Agency",
  PHOTOGRAPHER: "Photographer",
  VIDEOGRAPHER: "Videographer",
  EDITOR: "Editor",
  MODEL: "Model",
  PODCAST: "Podcast",
  UGC: "UGC",
};
const BUDGET_LABELS: Record<string, string> = { PAID: "Paid", TRADE: "Trade", FREE: "Free" };
const LOCATION_LABELS: Record<string, string> = { ON_SITE: "CreatorHub360", REMOTE: "Remote" };
const STATUS_LABELS: Record<string, string> = { OPEN: "Open", CLOSED: "Closed", FILLED: "Filled" };
const STATUS_STYLES: Record<string, string> = {
  OPEN: statusToneClass.success,
  CLOSED: statusToneClass.neutral,
  FILLED: statusToneClass.info,
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type PostDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  budgetType: string;
  budgetNote: string | null;
  dateNeeded: Date | null;
  location: string;
  expiresAt: Date | null;
  status: string;
  imageUrls: string[];
  videoUrls: string[];
  createdAt: Date;
  member: {
    id: string;
    fullName: string;
    profilePhotoUrl: string | null;
    role: string;
    company: { name: string } | null;
  };
  applications: {
    id: string;
    message: string | null;
    status: string;
    createdAt: Date;
    applicant: { id: string; fullName: string; profilePhotoUrl: string | null; role: string };
  }[];
  comments: {
    id: string;
    body: string;
    createdAt: Date;
    member: { id: string; fullName: string; profilePhotoUrl: string | null };
  }[];
  hasLiked: boolean;
  _count: { likes: number };
};

export function CollabPostDetail({ post, currentMemberId }: { post: PostDetail; currentMemberId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [applyMessage, setApplyMessage] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [liked, setLiked] = useState(post.hasLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [commentBody, setCommentBody] = useState("");
  const [isCommentPending, startCommentTransition] = useTransition();

  const isOwner = post.member.id === currentMemberId;
  const myApplication = post.applications.find((a) => a.applicant.id === currentMemberId);

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

  function handleComment() {
    if (!commentBody.trim()) return;
    startCommentTransition(async () => {
      const result = await addCollabPostComment(post.id, { body: commentBody });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCommentBody("");
      router.refresh();
    });
  }

  function handleApply() {
    startTransition(async () => {
      const result = await applyToPost(post.id, { message: applyMessage || undefined });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Application sent");
      setShowApplyForm(false);
      setApplyMessage("");
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

  function changeStatus(status: string) {
    startTransition(async () => {
      const result = await updateCollabPostStatus(post.id, status as "OPEN" | "CLOSED" | "FILLED");
      if (!result.success) toast.error(result.error);
      else toast.success("Status updated");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{post.title}</h1>
                <p className="text-xs text-muted-foreground">
                  Posted {format(post.createdAt, "MMM d, yyyy")}
                </p>
              </div>
              {isOwner ? (
                <Select value={post.status} onValueChange={changeStatus} disabled={isPending}>
                  <SelectTrigger className="w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["OPEN", "CLOSED", "FILLED"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={cn(STATUS_STYLES[post.status])}>
                  {STATUS_LABELS[post.status]}
                </Badge>
              )}
            </div>

            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{post.description}</p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{CATEGORY_LABELS[post.category]}</Badge>
              <Badge variant="outline">
                {BUDGET_LABELS[post.budgetType]}
                {post.budgetNote ? ` · ${post.budgetNote}` : ""}
              </Badge>
              <Badge variant="outline">{LOCATION_LABELS[post.location]}</Badge>
              {post.dateNeeded && <Badge variant="outline">Needed {format(post.dateNeeded, "MMM d, yyyy")}</Badge>}
              {post.expiresAt && <Badge variant="outline">Expires {format(post.expiresAt, "MMM d, yyyy")}</Badge>}
            </div>

            {post.imageUrls.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Images</p>
                <div className="grid grid-cols-3 gap-2">
                  {post.imageUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-square rounded-lg border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {post.videoUrls.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reference videos
                </p>
                <div className="space-y-1">
                  {post.videoUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm text-primary hover:underline"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLike}
              disabled={isPending}
              className={cn(
                "flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
                liked ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <Heart className={cn("size-4", liked && "fill-current")} />
              {likeCount > 0 ? `${likeCount} like${likeCount === 1 ? "" : "s"}` : "Like"}
            </button>
          </CardContent>
        </Card>

        {isOwner && (
          <Card>
            <CardContent className="p-5">
              <p className="mb-2 text-sm font-medium">Applications ({post.applications.length})</p>
              <ApplicationsPanel postId={post.id} applications={post.applications} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium">Comments ({post.comments.length})</p>
            <div className="space-y-2">
              <Textarea
                placeholder="Write a comment... use @username to mention someone"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
              />
              <Button size="sm" onClick={handleComment} disabled={isCommentPending || !commentBody.trim()}>
                Comment
              </Button>
            </div>
            {post.comments.length > 0 && (
              <div className="space-y-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="size-8 shrink-0">
                      {comment.member.profilePhotoUrl && <AvatarImage src={comment.member.profilePhotoUrl} />}
                      <AvatarFallback>{initials(comment.member.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate text-sm font-medium">{comment.member.fullName}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDistanceToNowStrict(comment.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{comment.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                {post.member.profilePhotoUrl && <AvatarImage src={post.member.profilePhotoUrl} />}
                <AvatarFallback>{initials(post.member.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{post.member.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {post.member.company?.name ?? post.member.role}
                </p>
              </div>
            </div>

            {!isOwner && (
              <div className="space-y-2">
                {myApplication ? (
                  <Badge
                    variant="outline"
                    className="flex w-full items-center justify-center gap-1 py-1.5 text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="size-3.5" /> Applied
                  </Badge>
                ) : showApplyForm ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a note (optional)"
                      value={applyMessage}
                      onChange={(e) => setApplyMessage(e.target.value)}
                      rows={3}
                    />
                    <Button className="w-full" onClick={handleApply} disabled={isPending}>
                      Send application
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setShowApplyForm(true)} disabled={post.status !== "OPEN"}>
                    Apply
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={handleMessage} disabled={isPending}>
                  <MessageCircle className="size-3.5" /> Message
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
