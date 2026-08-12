import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { CalendarClock, Clock, FolderKanban, DollarSign, Percent, Handshake, MessageCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCompactCurrency, formatHours } from "@/lib/utils/format";
import type { MyAnalytics as MyAnalyticsData } from "@/features/dashboard/services/my-analytics.service";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function messagePreview(m: { type: string; body: string | null }) {
  if (m.type === "TEXT") return m.body;
  if (m.type === "IMAGE") return "Sent an image";
  if (m.type === "FILE") return "Sent a file";
  return "Sent a message";
}

export function MyAnalytics({ data }: { data: MyAnalyticsData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Upcoming bookings" value={String(data.upcomingBookingsCount)} icon={CalendarClock} />
        <StatCard label="Hours worked" value={formatHours(data.hoursWorked)} icon={Clock} />
        <StatCard label="Personal projects" value={String(data.personalProjectsCount)} icon={FolderKanban} />
        <StatCard label="Personal GMV" value={formatCompactCurrency(data.personalGmv)} icon={DollarSign} />
        <StatCard label="Commission earned" value={formatCompactCurrency(data.commissionEarned)} icon={Percent} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Upcoming reservations</CardTitle>
            <Link href="/spaces" className="text-xs font-medium text-info hover:underline">
              Book a space
            </Link>
          </CardHeader>
          <CardContent>
            {data.upcomingReservations.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No upcoming reservations" className="py-6" />
            ) : (
              <ul className="space-y-3">
                {data.upcomingReservations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{r.spaceName}</span>
                    <span className="text-xs text-muted-foreground">{format(r.startTime, "MMM d, h:mm a")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

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

      {data.collaborationRequests > 0 && (
        <Card className="card-interactive border-community/20 bg-community/5 shadow-sm">
          <Link href="/community/collabs" className="block">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-community/10 text-community">
                <Handshake className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {data.collaborationRequests} pending collaboration request{data.collaborationRequests === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">Review who wants to work with you</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      )}
    </div>
  );
}
