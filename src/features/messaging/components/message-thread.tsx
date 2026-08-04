"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { markDirectConversationRead } from "@/features/messaging/services/conversation-actions";
import { MessageBubble, type DirectMessageItem } from "@/features/messaging/components/message-bubble";
import { MessageComposer } from "@/features/messaging/components/message-composer";

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
  initialMessages,
  initialOtherLastReadAt,
}: {
  conversationId: string;
  currentMemberId: string;
  initialMessages: DirectMessageItem[];
  initialOtherLastReadAt: Date | null;
}) {
  const [messages, setMessages] = useState<DirectMessageItem[]>(initialMessages);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherLastReadAt, setOtherLastReadAt] = useState<Date | null>(initialOtherLastReadAt);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(initialMessages[initialMessages.length - 1]?.id);
  // The interval tick and the onSent-triggered call can otherwise overlap: both
  // read lastIdRef before either's fetch resolves and updates it, so both fetch
  // and append the same "new" message. These two refs serialize poll() runs —
  // an overlapping call is queued instead of firing a second request against
  // the same stale cursor, so a message can only ever be appended once.
  const pollInFlightRef = useRef(false);
  const pollQueuedRef = useRef(false);

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
        setOtherTyping(Boolean(data.otherTyping));
        setOtherLastReadAt(data.otherLastReadAt ? new Date(data.otherLastReadAt) : null);
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

  const lastOwnMessageId = [...messages].reverse().find((m) => m.sender.id === currentMemberId)?.id;

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card md:h-[70vh]">
      <div className="flex-1 space-y-1 overflow-y-auto p-4">
        {messages.map((m, i) => {
          const isOwn = m.sender.id === currentMemberId;
          const isRead = Boolean(
            isOwn && m.id === lastOwnMessageId && otherLastReadAt && otherLastReadAt >= new Date(m.createdAt)
          );
          return (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={isOwn}
              isRead={isRead}
              showMeta={shouldShowMeta(messages, i)}
            />
          );
        })}
        {otherTyping && <p className="pl-9 text-xs italic text-muted-foreground">Typing…</p>}
        <div ref={bottomRef} />
      </div>
      <MessageComposer conversationId={conversationId} onSent={poll} />
    </div>
  );
}
