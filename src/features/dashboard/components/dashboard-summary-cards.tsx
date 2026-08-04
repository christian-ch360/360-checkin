import { DoorOpen, Lock, Users, CalendarCheck } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

export function DashboardSummaryCards({
  availableSpaces,
  occupiedSpaces,
  membersCheckedIn,
  todayBookings,
}: {
  availableSpaces: number;
  occupiedSpaces: number;
  membersCheckedIn: number;
  todayBookings: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Available Spaces" value={String(availableSpaces)} icon={DoorOpen} />
      <StatCard label="Occupied Spaces" value={String(occupiedSpaces)} icon={Lock} />
      <StatCard label="Members Checked In" value={String(membersCheckedIn)} icon={Users} />
      <StatCard label="Today's Bookings" value={String(todayBookings)} icon={CalendarCheck} />
    </div>
  );
}
