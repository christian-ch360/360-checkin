"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import {
  MessageCircle,
  MoreHorizontal,
  Pin,
  PinOff,
  Lock,
  LockOpen,
  Pencil,
  Trash2,
  Flag,
  FileText,
  Sparkles,
  HelpCircle,
  Handshake,
  Trophy,
  Users,
  Megaphone,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { BodyWithEntities, HashtagChip } from "@/features/community/components/hashtag-chip";
import { MentionAutocomplete } from "@/features/community/components/mention-autocomplete";
import { CommunityCommentThread } from "@/features/community/components/community-comment-thread";
import { ReactionBar, type ReactionSummaryItem } from "@/features/reactions/components/reaction-bar";
import { listReactors, toggleReaction } from "@/features/reactions/services/reaction-actions";
import {
  deleteCommunityPost,
  lockCommunityPost,
  pinCommunityPost,
  reportCommunityPost,
  unlockCommunityPost,
  unpinCommunityPost,
  updateCommunityPost,
} from "@/features/community/services/community-post-actions";
import type { CommunityPostListItem } from "@/features/community/services/community-post.service";

const TYPE_META: Record<string, { label: string; icon: typeof Sparkles }> = {
  UPDATE: { label: "Update", icon: Sparkles },
  QUESTION: { label: "Question", icon: HelpCircle },
  OPPORTUNITY: { label: "Opportunity", icon: Handshake },
  WIN: { label: "Win", icon: Trophy },
  COLLABORATION: { label: "Collaboration", icon: Users },
  ANNOUNCEMENT: { label: "Announcement", icon: Megaphone },
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CommunityPostCard({
  post,
  currentMemberId,
  canModerate,
  initialReactions,
}: {
  post: CommunityPostListItem;
  currentMemberId: string;
  canModerate: boolean;
  initialReactions: ReactionSummaryItem[];
}) {
  const router = useRouter();
  const [reactions, setReactions] = useState(initialReactions);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwn = post.author.id === currentMemberId;
  const typeMeta = TYPE_META[post.type];
  const TypeIcon = typeMeta.icon;
  const planName = post.author.subscription?.plan?.name;

  async function handleToggleReaction(emoji: Parameters<typeof toggleReaction>[2]) {
    const existing = reactions.find((r) => r.emoji === emoji);
    const optimistic = existing
      ? reactions
          .map((r) => (r.emoji === emoji ? { ...r, count: r.reactedByMe ? r.count - 1 : r.count + 1, reactedByMe: !r.reactedByMe } : r))
          .filter((r) => r.count > 0)
      : [...reactions, { emoji, count: 1, reactedByMe: true }];
    setReactions(optimistic);
    const result = await toggleReaction("POST", post.id, emoji, "/community");
    if (!result.success) toast.error(result.error);
  }

  async function saveEdit() {
    setBusy(true);
    const formData = new FormData();
    formData.set("type", post.type);
    formData.set("body", editBody.trim());
    const result = await updateCommunityPost(post.id, formData);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    const result = await deleteCommunityPost(post.id);
    if (!result.success) toast.error(result.error);
    else router.refresh();
  }

  async function togglePin() {
    const result = post.isPinned ? await unpinCommunityPost(post.id) : await pinCommunityPost(post.id);
    if (!result.success) toast.error(result.error);
    else router.refresh();
  }

  async function toggleLock() {
    const result = post.isLocked ? await unlockCommunityPost(post.id) : await lockCommunityPost(post.id);
    if (!result.success) toast.error(result.error);
    else router.refresh();
  }

  async function submitReport() {
    const result = await reportCommunityPost(post.id, reportReason.trim());
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Reported to moderators");
    setReportOpen(false);
    setReportReason("");
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0">
          {post.author.profilePhotoUrl && <AvatarImage src={post.author.profilePhotoUrl} />}
          <AvatarFallback>{initials(post.author.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-medium">{post.author.fullName}</p>
            {planName && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                {planName}
              </Badge>
            )}
            <Badge variant="secondary" className="h-4 gap-1 px-1.5 text-[10px] font-normal">
              <TypeIcon className="size-2.5" /> {typeMeta.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNowStrict(new Date(post.createdAt), { addSuffix: true })}
            {post.editedAt && " · edited"}
            {post.isPinned && " · 📌 pinned"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwn && (
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil className="size-3.5" /> Edit
              </DropdownMenuItem>
            )}
            {(isOwn || canModerate) && (
              <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
                <Trash2 className="size-3.5" /> Delete
              </DropdownMenuItem>
            )}
            {canModerate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={togglePin}>
                  {post.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  {post.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={toggleLock}>
                  {post.isLocked ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
                  {post.isLocked ? "Unlock comments" : "Lock comments"}
                </DropdownMenuItem>
              </>
            )}
            {!isOwn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                  <Flag className="size-3.5" /> Report
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editing ? (
        <div className="space-y-2">
          <MentionAutocomplete value={editBody} onChange={setEditBody} rows={3} autoFocus />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={busy}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <BodyWithEntities body={post.body} />
      )}

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map(({ hashtag }) => (
            <HashtagChip key={hashtag.id} tag={hashtag.tag} />
          ))}
        </div>
      )}

      {post.attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {post.attachments.map((a) => (
            <div key={a.id} className="overflow-hidden rounded-lg border bg-muted/30">
              {a.type === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.fileName} className="aspect-square w-full object-cover" loading="lazy" />
              ) : a.type === "VIDEO" ? (
                <video src={a.url} controls className="aspect-square w-full object-cover" />
              ) : (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted-foreground hover:bg-muted"
                >
                  <FileText className="size-6" />
                  <span className="line-clamp-2">{a.fileName}</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3">
        <ReactionBar
          reactions={reactions}
          onToggle={handleToggleReaction}
          reactors={(emoji) => listReactors("POST", post.id, emoji).then((r) => r.map((x) => x.member))}
        />
        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="size-3.5" /> {post._count.comments > 0 ? post._count.comments : "Comment"}
        </button>
      </div>

      {commentsOpen && (
        <CommunityCommentThread
          postId={post.id}
          currentMemberId={currentMemberId}
          canModerate={canModerate}
          isLocked={post.isLocked}
        />
      )}

      <AlertDialog open={reportOpen} onOpenChange={setReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report this post</AlertDialogTitle>
          </AlertDialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="What's wrong with this post?"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitReport} disabled={!reportReason.trim()}>
              Submit report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
