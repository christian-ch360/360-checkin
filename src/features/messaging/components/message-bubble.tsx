"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileText, Mic, Check, CheckCheck, Pin, MoreHorizontal, Pencil, Trash2, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ReactionBar, type ReactionSummaryItem } from "@/features/reactions/components/reaction-bar";
import { listReactors } from "@/features/reactions/services/reaction-actions";
import {
  deleteDirectMessage,
  editDirectMessage,
  pinDirectMessage,
  toggleMessageReaction,
  unpinDirectMessage,
} from "@/features/messaging/services/conversation-actions";
import type { ReactionEmoji } from "@prisma/client";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export type DirectMessageItem = {
  id: string;
  type: string;
  body: string | null;
  attachmentUrl: string | null;
  createdAt: Date;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  isPinned?: boolean;
  sender: { id: string; fullName: string; profilePhotoUrl: string | null };
};

export function MessageBubble({
  message,
  isOwn,
  isRead,
  showMeta,
  reactions,
  onReactionsChange,
  onChanged,
}: {
  message: DirectMessageItem;
  isOwn: boolean;
  isRead?: boolean;
  /** False when this message is grouped under a previous one from the same sender — hides the avatar/timestamp for a tighter iMessage-style run. */
  showMeta: boolean;
  reactions: ReactionSummaryItem[];
  onReactionsChange: (messageId: string, reactions: ReactionSummaryItem[]) => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.body ?? "");
  const [busy, setBusy] = useState(false);

  async function handleToggleReaction(emoji: ReactionEmoji) {
    const existing = reactions.find((r) => r.emoji === emoji);
    const optimistic = existing
      ? reactions
          .map((r) => (r.emoji === emoji ? { ...r, count: r.reactedByMe ? r.count - 1 : r.count + 1, reactedByMe: !r.reactedByMe } : r))
          .filter((r) => r.count > 0)
      : [...reactions, { emoji, count: 1, reactedByMe: true }];
    onReactionsChange(message.id, optimistic);
    const result = await toggleMessageReaction(message.id, emoji);
    if (!result.success) toast.error(result.error);
  }

  async function saveEdit() {
    if (!editValue.trim()) return;
    setBusy(true);
    const result = await editDirectMessage(message.id, editValue.trim());
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
    const result = await deleteDirectMessage(message.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  async function togglePin() {
    setBusy(true);
    const result = message.isPinned ? await unpinDirectMessage(message.id) : await pinDirectMessage(message.id);
    setBusy(false);
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  if (message.deletedAt) {
    return (
      <div className={cn("flex items-end gap-2", isOwn && "flex-row-reverse", !showMeta && "mt-0.5")}>
        <div className="size-7 shrink-0" />
        <div className={cn("max-w-[75%]", isOwn && "flex flex-col items-end")}>
          <div className="rounded-3xl bg-muted/50 px-4 py-2 text-sm italic text-muted-foreground">Message deleted</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group/bubble flex items-end gap-2", isOwn && "flex-row-reverse", !showMeta && "mt-0.5")}>
      <div className="size-7 shrink-0">
        {!isOwn && showMeta && (
          <Avatar className="size-7">
            {message.sender.profilePhotoUrl && <AvatarImage src={message.sender.profilePhotoUrl} />}
            <AvatarFallback className="text-[10px]">{initials(message.sender.fullName)}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className={cn("max-w-[75%] space-y-1", isOwn && "flex flex-col items-end")}>
        <div className="flex items-center gap-1">
          {isOwn && !editing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 opacity-0 group-hover/bubble:opacity-100"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                {message.type === "TEXT" && (
                  <DropdownMenuItem onSelect={() => setEditing(true)}>
                    <Pencil className="size-3.5" /> Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={togglePin} disabled={busy}>
                  {message.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  {message.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={handleDelete} disabled={busy}>
                  <Trash2 className="size-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6 shrink-0 opacity-0 group-hover/bubble:opacity-100">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={togglePin} disabled={busy}>
                  {message.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  {message.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div
            className={cn(
              "rounded-3xl px-4 py-2 text-sm",
              isOwn ? "bg-info text-info-foreground" : "bg-muted"
            )}
          >
            {message.isPinned && (
              <span className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase opacity-70">
                <Pin className="size-2.5" /> Pinned
              </span>
            )}
            {editing ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-7 w-48 text-sm text-foreground"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") setEditing(false);
                  }}
                />
                <Button size="sm" className="h-7 px-2" onClick={saveEdit} disabled={busy}>
                  Save
                </Button>
              </div>
            ) : (
              <>
                {message.type === "TEXT" && <p className="whitespace-pre-wrap">{message.body}</p>}
                {message.type === "IMAGE" && message.attachmentUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={message.attachmentUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="max-w-full rounded-2xl"
                  />
                )}
                {message.type === "FILE" && message.attachmentUrl && (
                  <a
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 underline"
                  >
                    <FileText className="size-4 shrink-0" /> {message.body || "Attached file"}
                  </a>
                )}
                {message.type === "VOICE" && (
                  <span className="flex items-center gap-2 opacity-70">
                    <Mic className="size-4" /> Voice message
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {reactions.length > 0 && (
          <ReactionBar
            reactions={reactions}
            onToggle={handleToggleReaction}
            reactors={(emoji) => listReactors("MESSAGE", message.id, emoji).then((r) => r.map((x) => x.member))}
            size="xs"
          />
        )}

        {showMeta && (
          <p
            className={cn(
              "flex items-center gap-1 text-[10px] text-muted-foreground",
              isOwn && "flex-row-reverse"
            )}
          >
            {format(message.createdAt, "h:mm a")}
            {message.editedAt && <span className="italic">(edited)</span>}
            {isOwn &&
              (isRead ? (
                <span className="flex items-center gap-0.5 text-info">
                  <CheckCheck className="size-3" /> Read
                </span>
              ) : (
                <Check className="size-3" />
              ))}
          </p>
        )}
      </div>
    </div>
  );
}
