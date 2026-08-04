import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { MessageCircle, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { NewConversationDialog } from "@/features/messaging/components/new-conversation-dialog";
import type { ConversationSummary } from "@/features/messaging/services/conversation.service";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function ConversationList({ conversations }: { conversations: ConversationSummary[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-sm font-semibold">Messages</h2>
        <NewConversationDialog />
      </div>
      <div className="flex-1 divide-y overflow-y-auto">
        {conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Tap the compose icon to message someone."
          />
        ) : (
          conversations.map((c) => (
            <Link
              key={c.routeId}
              href={`/messages/${c.routeId}`}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
            >
              <Avatar className="size-10 shrink-0">
                {!c.isGroup && c.other?.profilePhotoUrl && <AvatarImage src={c.other.profilePhotoUrl} />}
                <AvatarFallback>{c.isGroup ? <Users className="size-4" /> : initials(c.displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${c.unread ? "font-semibold" : "font-medium"}`}>{c.displayName}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNowStrict(c.updatedAt, { addSuffix: true })}
                  </span>
                </div>
                {c.subtitle && <p className="truncate text-xs text-muted-foreground">{c.subtitle}</p>}
                {c.lastMessagePreview && (
                  <p
                    className={`truncate text-sm ${c.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}
                  >
                    {c.lastMessagePreview}
                  </p>
                )}
              </div>
              {c.unread && <span className="size-2 shrink-0 rounded-full bg-info" />}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
