import { format } from "date-fns";
import { Clock, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, formatHours } from "@/lib/utils/format";

export function ActivityTab({
  totalHoursWorked,
  attendanceStats,
  spaceTimeStats,
}: {
  totalHoursWorked: number;
  attendanceStats: {
    totalVisits: number;
    lastVisit: { checkIn: Date } | null;
    isCurrentlyCheckedIn: boolean;
  };
  spaceTimeStats: {
    todayMinutes: number;
    weeklyMinutes: number;
    monthlyMinutes: number;
  };
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Hours this week" value={formatDuration(spaceTimeStats.weeklyMinutes)} icon={Clock} />
        <StatCard label="Hours this month" value={formatDuration(spaceTimeStats.monthlyMinutes)} icon={Clock} />
        <StatCard label="Total hours" value={formatHours(totalHoursWorked)} icon={TrendingUp} />
        <StatCard
          label="Current status"
          value={attendanceStats.isCurrentlyCheckedIn ? "🟢 Checked in" : "Checked out"}
          icon={Clock}
          accent={attendanceStats.isCurrentlyCheckedIn ? "primary" : "default"}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-medium">Check-in history</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Total visits</p>
              <p className="mt-1 text-sm font-medium">{attendanceStats.totalVisits}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Last visit</p>
              <p className="mt-1 text-sm font-medium">
                {attendanceStats.lastVisit ? format(attendanceStats.lastVisit.checkIn, "MMM d, yyyy") : "—"}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Today&apos;s hours</p>
              <p className="mt-1 text-sm font-medium">{formatDuration(spaceTimeStats.todayMinutes)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
