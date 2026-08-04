import { LogIn, LogOut, Users, Clock } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getFacilityOverview, getAttendanceHistory } from "@/features/checkin/services/checkin.service";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { CheckinScannerPanel } from "@/features/checkin/components/checkin-scanner-panel";
import { OccupancyList } from "@/features/checkin/components/occupancy-list";
import { AttendanceHistoryTable } from "@/features/checkin/components/attendance-history-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Check In" };

export default async function CheckInPage() {
  const actor = await requireCurrentMember();
  const [overview, history] = await Promise.all([
    getFacilityOverview(actor.organizationId),
    getAttendanceHistory(actor.organizationId),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Facility check-in" description="Scan a badge to check members in or out." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's Check Ins" value={String(overview.todayCheckIns)} icon={LogIn} />
        <StatCard label="Current Occupancy" value={String(overview.currentlyIn.length)} icon={Users} accent="primary" />
        <StatCard label="Today's Check Outs" value={String(overview.todayCheckOuts)} icon={LogOut} />
        <StatCard label="Average Visit Length" value={formatDuration(overview.averageMinutes)} icon={Clock} accent="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CheckinScannerPanel />

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Currently In The Space</CardTitle>
            <CardDescription>
              {overview.currentlyIn.length} Member{overview.currentlyIn.length === 1 ? "" : "s"} Currently Checked In
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OccupancyList
              members={overview.currentlyIn.map((c) => ({
                id: c.id,
                memberId: c.member.id,
                fullName: c.member.fullName,
                memberNumber: c.member.memberNumber,
                profilePhotoUrl: c.member.profilePhotoUrl,
                checkIn: c.checkIn,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Attendance Report</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <AttendanceHistoryTable
                checkIns={history.map((c) => ({
                  id: c.id,
                  checkIn: c.checkIn,
                  checkOut: c.checkOut,
                  duration: c.duration,
                  status: c.status,
                  member: c.member,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
