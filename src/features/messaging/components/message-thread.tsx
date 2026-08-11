"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listPinnedMessages,
  markDirectConversationRead,
  searchDirectMessages,
} from "@/features/messaging/services/conversation-actions";
import { MessageBubble, type DirectMessageItem } from "@/features/messaging/components/message-bubble";
import { MessageComposer } from "@/features/messaging/components/message-composer";
import type { ReactionSummaryItem } from "@/features/reactions/components/reaction-bar";

type ReadReceipt = { memberId: string; name: string; lastReadAt: string | null };

/** Consecutive messages from the same sender within 3 minutes render as one grouped run — avatar/timestamp only on the last message of the run. */
function shouldShowMeta(messages: DirectMessageItem[], index: number) {
  const next = messages[index + 1];
  if (!next) return true;
  if (next.sender.id !== messages[index].sender.id) return true;
  return new Date(next.createdAt).getTime() - new Date(messages[index].createdAt).getTime() > 3 * 60 * 1000;
}

export function MessageThread({
  conversationId,
  currentMemberId,
  isGroup = false,
  initialMessages,
  initialOtherLastReadAt,
  initialReactionsByMessageId = {},
}: {
  conversationId: string;
  currentMemberId: string;
  isGroup?: boolean;
  initialMessages: DirectMessageItem[];
  initialOtherLastReadAt: Date | null;
  initialReactionsByMessageId?: Record<string, ReactionSummaryItem[]>;
}) {
  const [messages, setMessages] = useState<DirectMessageItem[]>(initialMessages);
  const [reactionsByMessageId, setReactionsByMessageId] = useState(initialReactionsByMessageId);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [otherLastReadAt, setOtherLastReadAt] = useState<Date | null>(initialOtherLastReadAt);
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<DirectMessageItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof searchDirectMessages>>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(initialMessages[initialMessages.length - 1]?.id);
  // The interval tick and the onSent-triggered call can otherwise overlap: both
  // read lastIdRef before either's fetch resolves and updates it, so both fetch
  // and append the same "new" message. These two refs serialize poll() runs —
  // an overlapping call is queued instead of firing a second request against
  // the same stale cursor, so a message can only ever be appended once.
  const pollInFlightRef = useRef(false);
  const pollQueuedRef = useRef(false);

  const refreshPinned = useCallback(() => {
    listPinnedMessages(conversationId).then(setPinnedMessages).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    refreshPinned();
  }, [refreshPinned]);

  const poll = useCallback(async () => {
    if (pollInFlightRef.current) {
      pollQueuedRef.current = true;
      return;
    }
    pollInFlightRef.current = true;
    try {
      do {
        pollQueuedRef.current = false;
        const url = new URL(`/api/direct-messages/${conversationId}/poll`, window.location.origin);
        if (lastIdRef.current) url.searchParams.set("after", lastIdRef.current);
        const res = await fetch(url.toString());
        if (!res.ok) break;
        const data = await res.json();
        if (data.newMessages?.length) {
          setMessages((prev) => [...prev, ...data.newMessages]);
          lastIdRef.current = data.newMessages[data.newMessages.length - 1].id;
          markDirectConversationRead(conversationId).catch(() => {});
        }
        if (data.reactionsByMessageId) setReactionsByMessageId((prev) => ({ ...prev, ...data.reactionsByMessageId }));
        setTypingNames(data.typingParticipants ?? (data.otherTyping ? ["Someone"] : []));
        setOtherLastReadAt(data.otherLastReadAt ? new Date(data.otherLastReadAt) : null);
        if (data.readReceipts) setReadReceipts(data.readReceipts);
      } while (pollQueuedRef.current);
    } catch {
      // transient poll failure -- next tick will retry
    } finally {
      pollInFlightRef.current = false;
    }
  }, [conversationId]);

  useEffect(() => {
    markDirectConversationRead(conversationId).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (interval) return;
      interval = setInterval(poll, document.visibilityState === "visible" ? 2500 : 15000);
    }
    function stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    start();
    const onVisibility = () => {
      stop();
      start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchDirectMessages(trimmed).then(setSearchResults).catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const lastOwnMessageId = [...messages].reverse().find((m) => m.sender.id === currentMemberId)?.id;

  function handleReactionsChange(messageId: string, reactions: ReactionSummaryItem[]) {
    setReactionsByMessageId((prev) => ({ ...prev, [messageId]: reactions }));
  }

  function scrollToMessage(messageId: string) {
    document.getElementById(`msg-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setPinnedOpen(false);
    setSearchOpen(false);
  }

  const readByNames = isGroup
    ? readReceipts
        .filter((r) => {
          const lastOwn = messages.find((m) => m.id === lastOwnMessageId);
          return lastOwn && r.lastReadAt && new Date(r.lastReadAt) >= new Date(lastOwn.createdAt);
        })
        .map((r) => r.name)
    : [];

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card md:h-[70vh]">
      <div className="flex items-center gap-1 border-b px-3 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => setPinnedOpen((v) => !v)}
        >
          <Pin className="size-3.5" /> Pinned {pinnedMessages.length > 0 && `(${pinnedMessages.length})`}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-7"
          onClick={() => setSearchOpen((v) => !v)}
        >
          <Search className="size-3.5" />
        </Button>
      </div>

      {pinnedOpen && (
        <div className="max-h-40 overflow-y-auto border-b bg-muted/30 p-2">
          {pinnedMessages.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">No pinned messages yet.</p>
          ) : (
            pinnedMessages.map((m) => (
              <button
                key={m.id}
                onClick={() => scrollToMessage(m.id)}
                className="flex w-full items-start gap-2 rounded-md p-1.5 text-left text-xs hover:bg-muted"
              >
                <span className="font-medium">{m.sender.fullName}:</span>
                <span className="truncate text-muted-foreground">{m.body || "Attachment"}</span>
              </button>
            ))
          )}
        </div>
      )}

      {searchOpen && (
        <div className="border-b bg-muted/30 p-2">
          <div className="flex items-center gap-1.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="h-8"
            />
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setSearchOpen(false)}>
              <X className="size-3.5" />
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto">
              {searchResults
                .filter((r) => r.conversation.id === conversationId)
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => scrollToMessage(r.id)}
                    className="flex w-full items-start gap-2 rounded-md p-1.5 text-left text-xs hover:bg-muted"
                  >
                    <span className="font-medium">{r.sender.fullName}:</span>
                    <span className="truncate text-muted-foreground">{r.body}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto p-4">
        {messages.map((m, i) => {
          const isOwn = m.sender.id === currentMemberId;
          const isRead = Boolean(
            !isGroup &&
              isOwn &&
              m.id === lastOwnMessageId &&
              otherLastReadAt &&
              otherLastReadAt >= new Date(m.createdAt)
          );
          return (
            <div key={m.id} id={`msg-${m.id}`}>
              <MessageBubble
                message={m}
                isOwn={isOwn}
                isRead={isRead}
                showMeta={shouldShowMeta(messages, i)}
                reactions={reactionsByMessageId[m.id] ?? []}
                onReactionsChange={handleReactionsChange}
                onChanged={() => {
                  poll();
                  refreshPinned();
                }}
              />
            </div>
          );
        })}
        {isGroup && readByNames.length > 0 && (
          <p className="pr-9 text-right text-[10px] text-muted-foreground">Seen by {readByNames.join(", ")}</p>
        )}
        {typingNames.length > 0 && (
          <p className="pl-9 text-xs italic text-muted-foreground">
            {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
          </p>
        )}
        <div ref={bottomRef} />
      </div>
      <MessageComposer
        conversationId={conversationId}
        onSent={() => {
          poll();
          refreshPinned();
        }}
      />
    </div>
  );
}
