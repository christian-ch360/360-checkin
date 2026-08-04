import Link from "next/link";
import { QrCode, CalendarCheck, FileCheck2, Clock, MessageSquareWarning, MessageCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { formatDistanceToNowStrict } from "date-fns";
import type { OperationsSummary as OperationsSummaryData } from "@/features/dashboard/services/operations-summary.service";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function messagePreview(m: { type: string; body: string | null }) {
  if (m.type === "TEXT") return m.body;
  if (m.type === "IMAGE") return "Sent an image";
  if (m.type === "FILE") return "Sent a file";
  return "Sent a message";
}

export function OperationsSummary({ data }: { data: OperationsSummaryData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Today's check-ins" value={String(data.todayCheckIns)} icon={QrCode} />
        <StatCard label="Today's bookings" value={String(data.todayBookings)} icon={CalendarCheck} />
        <StatCard label="New applications" value={String(data.newApplications)} icon={FileCheck2} />
        <StatCard
          label="Pending approvals"
          value={String(data.pendingApprovals)}
          icon={Clock}
          accent={data.pendingApprovals > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Unread feedback"
          value={String(data.unreadFeedback)}
          icon={MessageSquareWarning}
          accent={data.unreadFeedback > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityFeed items={data.recentCreatorActivity} />

        <Card className="border shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Recent messages</CardTitle>
            <Link href="/messages" className="flex items-center gap-1 text-xs font-medium text-info hover:underline">
              <MessageCircle className="size-3.5" /> View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentMessages.length === 0 ? (
              <EmptyState icon={MessageCircle} title="No messages yet" className="py-6" />
            ) : (
              <ol className="space-y-4">
                {data.recentMessages.map((m) => (
                  <li key={m.id} className="flex items-start gap-3">
                    <Avatar className="size-6 shrink-0">
                      {m.sender.profilePhotoUrl && <AvatarImage src={m.sender.profilePhotoUrl} />}
                      <AvatarFallback className="text-[10px]">{initials(m.sender.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-medium">{m.sender.fullName}</span>{" "}
                        <span className="text-muted-foreground">{messagePreview(m)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNowStrict(m.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
