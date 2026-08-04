"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { markConversationRead } from "@/features/collab-hub/services/conversation-actions";
import { MessageBubble, type MessageItem } from "@/features/collab-hub/components/message-bubble";
import { MessageComposer } from "@/features/collab-hub/components/message-composer";

export function MessageThread({
  conversationId,
  currentMemberId,
  initialMessages,
  initialOtherLastReadAt,
  projects,
  reservations,
}: {
  conversationId: string;
  currentMemberId: string;
  initialMessages: MessageItem[];
  initialOtherLastReadAt: Date | null;
  projects: { id: string; name: string }[];
  reservations: { id: string; label: string }[];
}) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherLastReadAt, setOtherLastReadAt] = useState<Date | null>(initialOtherLastReadAt);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(initialMessages[initialMessages.length - 1]?.id);

  const poll = useCallback(async () => {
    const url = new URL(`/api/messages/${conversationId}/poll`, window.location.origin);
    if (lastIdRef.current) url.searchParams.set("after", lastIdRef.current);
    try {
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json();
      if (data.newMessages?.length) {
        setMessages((prev) => [...prev, ...data.newMessages]);
        lastIdRef.current = data.newMessages[data.newMessages.length - 1].id;
        markConversationRead(conversationId).catch(() => {});
      }
      setOtherTyping(Boolean(data.otherTyping));
      setOtherLastReadAt(data.otherLastReadAt ? new Date(data.otherLastReadAt) : null);
    } catch {
      // transient poll failure -- next tick will retry
    }
  }, [conversationId]);

  useEffect(() => {
    markConversationRead(conversationId).catch(() => {});
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
    <div className="flex h-[70vh] flex-col rounded-2xl border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const isOwn = m.sender.id === currentMemberId;
          const isRead = Boolean(
            isOwn && m.id === lastOwnMessageId && otherLastReadAt && otherLastReadAt >= new Date(m.createdAt)
          );
          return <MessageBubble key={m.id} message={m} isOwn={isOwn} isRead={isRead} />;
        })}
        {otherTyping && <p className="text-xs italic text-muted-foreground">Typing…</p>}
        <div ref={bottomRef} />
      </div>
      <MessageComposer
        conversationId={conversationId}
        projects={projects}
        reservations={reservations}
        onSent={poll}
      />
    </div>
  );
}
