"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MentionAutocomplete } from "@/features/community/components/mention-autocomplete";
import { BodyWithEntities } from "@/features/community/components/hashtag-chip";
import {
  addCommunityComment,
  deleteCommunityComment,
  editCommunityComment,
} from "@/features/community/services/community-comment-actions";

type CommentNode = {
  id: string;
  parentId: string | null;
  body: string;
  editedAt: Date | string | null;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  author: { id: string; fullName: string; profilePhotoUrl: string | null };
  replies: CommentNode[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function buildTree(flat: Omit<CommentNode, "replies">[]): CommentNode[] {
  const byId = new Map<string, CommentNode>(flat.map((c) => [c.id, { ...c, replies: [] }]));
  const roots: CommentNode[] = [];
  for (const comment of byId.values()) {
    if (comment.parentId && byId.has(comment.parentId)) {
      byId.get(comment.parentId)!.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }
  return roots;
}

function CommentNodeView({
  comment,
  postId,
  currentMemberId,
  canModerate,
  depth,
  onChanged,
}: {
  comment: CommentNode;
  postId: string;
  currentMemberId: string;
  canModerate: boolean;
  depth: number;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const isOwn = comment.author.id === currentMemberId;

  async function submitReply() {
    if (!replyBody.trim()) return;
    setBusy(true);
    const result = await addCommunityComment(postId, { body: replyBody.trim(), parentId: comment.id });
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setReplyBody("");
    setReplying(false);
    onChanged();
  }

  async function saveEdit() {
    if (!editBody.trim()) return;
    setBusy(true);
    const result = await editCommunityComment(comment.id, editBody.trim());
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setEditing(false);
    onChanged();
  }

  async function handleDelete() {
    setBusy(true);
    const result = await deleteCommunityComment(comment.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  return (
    <div className={depth > 0 ? "ml-8 border-l pl-3" : ""}>
      <div className="flex gap-2 py-2">
        <Avatar className="size-7 shrink-0">
          {comment.author.profilePhotoUrl && <AvatarImage src={comment.author.profilePhotoUrl} />}
          <AvatarFallback className="text-[10px]">{initials(comment.author.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-muted/60 px-3 py-1.5">
            <div className="flex items-baseline gap-1.5">
              <p className="text-xs font-medium">{comment.author.fullName}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNowStrict(new Date(comment.createdAt), { addSuffix: true })}
                {comment.editedAt && " · edited"}
              </p>
            </div>
            {comment.deletedAt ? (
              <p className="text-sm italic text-muted-foreground">[deleted]</p>
            ) : editing ? (
              <div className="mt-1 space-y-1.5">
                <MentionAutocomplete value={editBody} onChange={setEditBody} rows={2} className="text-sm" autoFocus />
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-6 px-2 text-xs" onClick={saveEdit} disabled={busy}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <BodyWithEntities body={comment.body} />
            )}
          </div>
          {!comment.deletedAt && (
            <div className="mt-0.5 flex gap-3 pl-3 text-[11px] text-muted-foreground">
              <button onClick={() => setReplying((v) => !v)} className="hover:text-foreground">
                Reply
              </button>
              {isOwn && (
                <button onClick={() => setEditing(true)} className="hover:text-foreground">
                  Edit
                </button>
              )}
              {(isOwn || canModerate) && (
                <button onClick={handleDelete} className="hover:text-destructive" disabled={busy}>
                  Delete
                </button>
              )}
            </div>
          )}
          {replying && (
            <div className="mt-1.5 space-y-1.5">
              <MentionAutocomplete
                value={replyBody}
                onChange={setReplyBody}
                placeholder={`Reply to ${comment.author.fullName}…`}
                rows={2}
                className="text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-6 px-2 text-xs" onClick={submitReply} disabled={busy}>
                  Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replies.map((reply) => (
        <CommentNodeView
          key={reply.id}
          comment={reply}
          postId={postId}
          currentMemberId={currentMemberId}
          canModerate={canModerate}
          depth={Math.min(depth + 1, 3)}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

export function CommunityCommentThread({
  postId,
  currentMemberId,
  canModerate,
  isLocked,
}: {
  postId: string;
  currentMemberId: string;
  canModerate: boolean;
  isLocked: boolean;
}) {
  const [comments, setComments] = useState<Omit<CommentNode, "replies">[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  function load() {
    fetch(`/api/community/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(() => setComments([]));
  }

  useEffect(load, [postId]);

  async function submitComment() {
    if (!newComment.trim()) return;
    setPosting(true);
    const result = await addCommunityComment(postId, { body: newComment.trim() });
    setPosting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setNewComment("");
    load();
  }

  const tree = comments ? buildTree(comments) : [];

  return (
    <div className="border-t pt-2">
      {comments === null ? (
        <p className="py-2 text-xs text-muted-foreground">Loading comments…</p>
      ) : (
        tree.map((c) => (
          <CommentNodeView
            key={c.id}
            comment={c}
            postId={postId}
            currentMemberId={currentMemberId}
            canModerate={canModerate}
            depth={0}
            onChanged={load}
          />
        ))
      )}

      {isLocked ? (
        <p className="pt-2 text-xs text-muted-foreground">Comments are locked on this post.</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          <MentionAutocomplete
            value={newComment}
            onChange={setNewComment}
            placeholder="Write a comment…"
            rows={1}
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button size="sm" className="h-7 px-3 text-xs" onClick={submitComment} disabled={posting || !newComment.trim()}>
              Comment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
