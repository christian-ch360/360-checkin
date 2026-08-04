import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type NotificationsSummary = {
  unreadCount: number;
  recent: { id: string; title: string; link: string | null }[];
};

export function HomeNotificationsSummary({ summary }: { summary: NotificationsSummary }) {
  const hasUnread = summary.unreadCount > 0;
  const top = summary.recent[0];
  const content = (
    <Card className="card-interactive h-full hover:bg-muted/50">
      <CardContent className="flex h-full items-center gap-3 p-4">
        <div
          className={
            "flex size-9 shrink-0 items-center justify-center rounded-lg " +
            (hasUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
          }
        >
          {hasUnread ? <Bell className="size-4.5" /> : <BellOff className="size-4.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {hasUnread ? `${summary.unreadCount} new notification${summary.unreadCount === 1 ? "" : "s"}` : "No new notifications"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{top ? top.title : "You're all caught up"}</p>
        </div>
      </CardContent>
    </Card>
  );

  return top?.link ? (
    <Link href={top.link} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}
