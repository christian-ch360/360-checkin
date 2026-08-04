"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import type { ConversationSummary } from "@/features/messaging/services/conversation.service";

export function MessagesShell({
  conversations,
  children,
}: {
  conversations: ConversationSummary[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const onThread = pathname !== "/messages";

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[340px_1fr]">
      {/* Mobile: list-only on /messages, thread-only on /messages/[id] — desktop keeps both panes visible. */}
      <div className={cn("min-h-0 overflow-y-auto", onThread && "hidden md:block")}>
        <ConversationList conversations={conversations} />
      </div>

      <div className={cn("min-h-0", !onThread && "hidden md:flex md:flex-col")}>
        {!onThread ? (
          <div className="hidden h-full flex-col items-center justify-center gap-2 rounded-2xl border bg-card text-sm text-muted-foreground md:flex">
            <MessageSquare className="size-8 opacity-40" />
            Select a conversation
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
